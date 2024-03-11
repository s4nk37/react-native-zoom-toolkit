import type {
  GestureStateChangeEvent,
  PinchGestureHandlerEventPayload,
  TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import type { HitSlop } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import type { WithTimingConfig } from 'react-native-reanimated';

export type Vector<T> = {
  x: T;
  y: T;
};

export type SizeVector<T> = {
  width: T;
  height: T;
};

export type BoundsFuction = (scale: number) => Vector<number>;

export enum PanMode {
  CLAMP = 'clamp',
  FREE = 'free',
  FRICTION = 'friction',
}

export enum ScaleMode {
  CLAMP = 'clamp',
  BOUNCE = 'bounce',
}

export type CommonZoomProps = {
  hitSlop?: HitSlop;
  timingConfig?: WithTimingConfig;
};

export type CommonResumableProps = {
  minScale?: number;
  maxScale?: number;
  panMode?: PanMode;
  scaleMode?: ScaleMode;
  panWithPinch?: boolean;
};

export type TapEvent = GestureStateChangeEvent<TapGestureHandlerEventPayload>;
export type PinchEvent =
  GestureStateChangeEvent<PinchGestureHandlerEventPayload>;

export type CommonZoomCallbackProps = {
  onTap?: (e: TapEvent) => void;
  onDoubleTap?: (e: TapEvent) => void;
  onPinchStart?: (e: PinchEvent) => void;
  onPinchEnd?: (e: PinchEvent, success: boolean) => void;
};