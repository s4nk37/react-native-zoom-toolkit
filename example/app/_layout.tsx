import React from 'react';
import { StyleSheet } from 'react-native';

import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Orientation from 'expo-screen-orientation';

Orientation.lockAsync(Orientation.OrientationLock.PORTRAIT_UP);

import { default as CustomDrawer } from '../src/navigation/Drawer';

const _layout = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Drawer
        screenOptions={{ headerShown: false }}
        drawerContent={CustomDrawer}
      >
        <Drawer.Screen name="index" />
        <Drawer.Screen name="resumableskia" />
        <Drawer.Screen name="gallery" />
        <Drawer.Screen name="cropbasic" />
        <Drawer.Screen name="cropskia" />
        <Drawer.Screen name="snapback" />
      </Drawer>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default _layout;
