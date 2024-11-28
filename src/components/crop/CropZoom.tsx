import React, { useImperativeHandle } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  clamp,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { crop } from '../../commons/utils/crop';
import { useSizeVector } from '../../commons/hooks/useSizeVector';
import { getCropRotatedSize } from '../../commons/utils/getCropRotatedSize';
import { usePanCommons } from '../../commons/hooks/usePanCommons';
import { usePinchCommons } from '../../commons/hooks/usePinchCommons';
import { getMaxScale } from '../../commons/utils/getMaxScale';
import { useVector } from '../../commons/hooks/useVector';

import type { BoundsFuction } from '../../commons/types';

import type {
  CropZoomProps,
  CropContextResult,
  CropZoomType,
  FlipCallback,
  CropZoomState,
  CropAssignableState,
  RotationCallback,
} from './types';
import withCropValidation from '../../commons/hoc/withCropValidation';

const TAU = Math.PI * 2;
const RAD2DEG = 180 / Math.PI;

type CropZoomPropsWithRef = CropZoomProps & {
  reference?: React.ForwardedRef<CropZoomType>;
};

const CropZoom: React.FC<CropZoomPropsWithRef> = (props) => {
  const {
    reference,
    children,
    cropSize,
    resolution,
    minScale = 1,
    maxScale: userMaxScale,
    scaleMode = 'bounce',
    panMode = 'free',
    allowPinchPanning = true,
    onUpdate,
    onGestureEnd,
    OverlayComponent,
    onPanStart: onUserPanStart,
    onPanEnd: onUserPanEnd,
    onPinchStart: onUserPinchStart,
    onPinchEnd: onUserPinchEnd,
    onTap,
  } = props;

  const translate = useVector(0, 0);
  const offset = useVector(0, 0);
  const scale = useSharedValue<number>(minScale);
  const scaleOffset = useSharedValue<number>(minScale);
  const rotation = useSharedValue<number>(0);
  const rotate = useVector(0, 0);

  const container = useSizeVector(1, 1);
  const detector = useSizeVector(1, 1);
  const sizeAngle = useSharedValue<number>(0);

  const maxScale = useDerivedValue(() => {
    const { width, height } = container;
    const scaleValue = getMaxScale(
      { width: width.value, height: height.value },
      resolution
    );

    return userMaxScale ?? scaleValue;
  }, [container, userMaxScale, resolution]);

  useDerivedValue(() => {
    const size = getCropRotatedSize({
      crop: cropSize,
      resolution: resolution,
      angle: sizeAngle.value,
    });

    const isFlipped = rotation.value % Math.PI !== 0;
    const render1 = container.width.value === 1 && container.height.value === 1;

    container.width.value = render1 ? size.width : withTiming(size.width);
    container.height.value = render1 ? size.height : withTiming(size.height);

    detector.width.value = isFlipped ? size.height : size.width;
    detector.height.value = isFlipped ? size.width : size.height;
  }, [cropSize, resolution, sizeAngle, rotation, container, detector]);

  useDerivedValue(() => {
    onUpdate?.({
      width: container.width.value,
      height: container.height.value,
      translateX: translate.x.value,
      translateY: translate.y.value,
      scale: scale.value,
      rotate: rotation.value,
      rotateX: rotate.x.value,
      rotateY: rotate.y.value,
    });
  }, [container, translate, scale, rotate, rotation]);

  const boundsFn: BoundsFuction = (optionalScale) => {
    'worklet';
    const scaleVal = optionalScale ?? scale.value;
    let size = { width: container.width.value, height: container.height.value };

    const isInInverseAspectRatio = rotation.value % Math.PI !== 0;
    if (isInInverseAspectRatio) {
      size = { width: size.height, height: size.width };
    }

    const boundX = Math.max(0, size.width * scaleVal - cropSize.width) / 2;
    const boundY = Math.max(0, size.height * scaleVal - cropSize.height) / 2;
    return { x: boundX, y: boundY };
  };

  const {
    gesturesEnabled,
    onTouchesMove,
    onPinchStart,
    onPinchUpdate,
    onPinchEnd,
  } = usePinchCommons({
    container: detector,
    translate,
    offset,
    scale,
    scaleOffset,
    minScale,
    maxScale,
    allowPinchPanning,
    scaleMode,
    pinchCenteringMode: 'sync',
    boundFn: boundsFn,
    userCallbacks: {
      onGestureEnd: onGestureEnd,
      onPinchStart: onUserPinchStart,
      onPinchEnd: onUserPinchEnd,
    },
  });

  const { onPanStart, onPanChange, onPanEnd } = usePanCommons({
    container: detector,
    translate,
    offset,
    panMode,
    boundFn: boundsFn,
    userCallbacks: {
      onGestureEnd: onGestureEnd,
      onPanStart: onUserPanStart,
      onPanEnd: onUserPanEnd,
    },
  });

  const pinch = Gesture.Pinch()
    .withTestId('pinch')
    .onTouchesMove(onTouchesMove)
    .onStart(onPinchStart)
    .onUpdate(onPinchUpdate)
    .onEnd(onPinchEnd);

  const pan = Gesture.Pan()
    .withTestId('pan')
    .enabled(gesturesEnabled)
    .maxPointers(1)
    .onStart(onPanStart)
    .onChange(onPanChange)
    .onEnd(onPanEnd);

  const tap = Gesture.Tap()
    .withTestId('tap')
    .enabled(gesturesEnabled)
    .maxDuration(250)
    .numberOfTaps(1)
    .runOnJS(true)
    .onEnd((e) => onTap?.(e));

  const detectorStyle = useAnimatedStyle(() => {
    return {
      width: detector.width.value,
      height: detector.height.value,
      position: 'absolute',
      transform: [
        { translateX: translate.x.value },
        { translateY: translate.y.value },
        { scale: scale.value },
      ],
    };
  }, [detector, translate, scale]);

  const childStyle = useAnimatedStyle(() => {
    return {
      width: container.width.value,
      height: container.height.value,
      transform: [
        { translateX: translate.x.value },
        { translateY: translate.y.value },
        { scale: scale.value },
        { rotate: `${rotation.value}rad` },
        { rotateX: `${rotate.x.value}rad` },
        { rotateY: `${rotate.y.value}rad` },
      ],
    };
  }, [container, translate, scale, rotation, rotate]);

  // Reference handling section
  const resetTo = (st: CropAssignableState, animate: boolean = true) => {
    translate.x.value = animate ? withTiming(st.translateX) : st.translateX;
    translate.y.value = animate ? withTiming(st.translateY) : st.translateY;
    scale.value = animate ? withTiming(st.scale) : st.scale;
    scaleOffset.value = st.scale;

    rotate.x.value = animate ? withTiming(st.rotateX) : st.rotateX;
    rotate.y.value = animate ? withTiming(st.rotateY) : st.rotateY;
    rotation.value = animate
      ? withTiming(st.rotate, undefined, () => {
          canRotate.value = true;
          rotation.value = rotation.value % TAU;
        })
      : st.rotate % TAU;
  };

  const canRotate = useSharedValue<boolean>(true);
  const handleRotate: RotationCallback = (
    animate = true,
    clockwise = true,
    cb
  ) => {
    if (!canRotate.value) return;
    if (animate) canRotate.value = false;

    // Determine the direction multiplier based on clockwise or counterclockwise rotation
    const direction = clockwise ? 1 : -1;
    const toAngle = rotation.value + direction * (Math.PI / 2);
    sizeAngle.value = toAngle;
    cb?.(toAngle % TAU);

    resetTo(
      {
        translateX: 0,
        translateY: 0,
        scale: minScale,
        rotate: toAngle,
        rotateX: rotate.x.value,
        rotateY: rotate.y.value,
      },
      animate
    );
  };

  const flipHorizontal: FlipCallback = (animate = true, cb) => {
    const toAngle = rotate.y.value !== Math.PI ? Math.PI : 0;
    cb?.(toAngle * RAD2DEG);
    rotate.y.value = animate ? withTiming(toAngle) : toAngle;
  };

  const flipVertical: FlipCallback = (animate = true, cb) => {
    const toAngle = rotate.x.value !== Math.PI ? Math.PI : 0;
    cb?.(toAngle * RAD2DEG);
    rotate.x.value = animate ? withTiming(toAngle) : toAngle;
  };

  const handleCrop = (fixedWidth?: number): CropContextResult => {
    const context: CropContextResult['context'] = {
      rotationAngle: rotation.value * RAD2DEG,
      flipHorizontal: rotate.y.value === Math.PI,
      flipVertical: rotate.x.value === Math.PI,
    };

    const result = crop({
      scale: scale.value,
      cropSize: cropSize,
      resolution: resolution,
      itemSize: {
        width: container.width.value,
        height: container.height.value,
      },
      translation: { x: translate.x.value, y: translate.y.value },
      isRotated: context.rotationAngle % 180 !== 0,
      fixedWidth,
    });

    return {
      crop: result.crop,
      resize: result.resize,
      context,
    };
  };

  const handleRequestState = (): CropZoomState<number> => ({
    width: container.width.value,
    height: container.height.value,
    translateX: translate.x.value,
    translateY: translate.y.value,
    scale: scale.value,
    rotate: rotation.value,
    rotateX: rotate.x.value,
    rotateY: rotate.y.value,
  });

  const assignState = (state: CropAssignableState, animate: boolean = true) => {
    const toScale = clamp(state.scale, minScale, maxScale.value);

    const { x: boundX, y: boundY } = boundsFn(toScale);
    const translateX = clamp(state.translateX, -1 * boundX, boundX);
    const translateY = clamp(state.translateY, -1 * boundY, boundY);

    const DEG90 = Math.PI / 2;
    const toRotate = Math.floor((state.rotate % (Math.PI * 2)) / DEG90) * DEG90;
    const rotateX = Math.sign(state.rotateX - DEG90) === 1 ? Math.PI : 0;
    const rotateY = Math.sign(state.rotateY - DEG90) === 1 ? Math.PI : 0;

    resetTo(
      {
        translateX,
        translateY,
        scale: toScale,
        rotate: toRotate,
        rotateX,
        rotateY,
      },
      animate
    );
  };

  useImperativeHandle(reference, () => ({
    rotate: handleRotate,
    flipHorizontal: flipHorizontal,
    flipVertical: flipVertical,
    reset: (animate) =>
      resetTo(
        {
          translateX: 0,
          translateY: 0,
          scale: minScale,
          rotate: 0,
          rotateX: 0,
          rotateY: 0,
        },
        animate
      ),
    crop: handleCrop,
    requestState: handleRequestState,
    assignState: assignState,
  }));

  const rootStyle: ViewStyle = {
    minWidth: cropSize.width,
    minHeight: cropSize.height,
  };

  return (
    <View style={[rootStyle, styles.root, styles.center]}>
      <Animated.View style={childStyle}>{children}</Animated.View>
      <View style={styles.absolute}>{OverlayComponent?.()}</View>

      <GestureDetector gesture={Gesture.Race(pinch, pan, tap)}>
        <Animated.View style={detectorStyle} />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  absolute: {
    position: 'absolute',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default withCropValidation<CropZoomType, CropZoomProps>(CropZoom);
