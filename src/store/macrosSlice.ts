import {createSelector, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {KeyboardAPI} from 'src/utils/keyboard-api';
import {getMacroAPI, isDelaySupported} from 'src/utils/macro-api';
import {
  expressionToSequence,
  optimizedSequenceToRawSequence,
  rawSequenceToOptimizedSequence,
  sequenceToExpression,
} from 'src/utils/macro-api/macro-api.common';
import {RawKeycodeSequence} from 'src/utils/macro-api/types';
import type {ConnectedDevice} from '../types/types';
import {
  getSelectedConnectedDevice,
  getSelectedKeyboardAPI,
} from './devicesSlice';
import type {AppThunk, RootState} from './index';

type MacrosState = {
  ast: RawKeycodeSequence[];
  macroBufferSize: number;
  macroCount: number;
  macroCapacity: number;
  macroNames: string[];
  isFeatureSupported: boolean;
};

const macrosInitialState: MacrosState = {
  ast: [],
  macroBufferSize: 0,
  macroCount: 0,
  macroCapacity: 0,
  macroNames: [],
  isFeatureSupported: true,
};

const macrosSlice = createSlice({
  name: 'macros',
  initialState: macrosInitialState,
  reducers: {
    loadMacrosSuccess: (
      state,
      action: PayloadAction<{
        ast: RawKeycodeSequence[];
        macroBufferSize: number;
        macroCount: number;
        macroCapacity: number;
        macroNames: string[];
      }>,
    ) => {
      state.ast = action.payload.ast;
      state.macroBufferSize = action.payload.macroBufferSize;
      state.macroCount = action.payload.macroCount;
      state.macroCapacity = action.payload.macroCapacity;
      state.macroNames = action.payload.macroNames;
    },
    saveMacrosSuccess: (
      state,
      action: PayloadAction<{ast: RawKeycodeSequence[]}>,
    ) => {
      state.ast = action.payload.ast;
    },
    setMacrosNotSupported: (state) => {
      state.isFeatureSupported = false;
    },
    saveMacroMetadataSuccess: (
      state,
      action: PayloadAction<{macroCount: number; macroNames: string[]}>,
    ) => {
      state.macroCount = action.payload.macroCount;
      state.macroNames = action.payload.macroNames;
    },
  },
});

export const {
  loadMacrosSuccess,
  saveMacrosSuccess,
  setMacrosNotSupported,
  saveMacroMetadataSuccess,
} = macrosSlice.actions;

export default macrosSlice.reducer;

export const loadMacros =
  (connectedDevice: ConnectedDevice): AppThunk =>
  async (dispatch, getState) => {
    const {protocol} = connectedDevice;
    if (protocol < 8) {
      dispatch(setMacrosNotSupported());
    } else {
      try {
        const state = getState();
        const api = getSelectedKeyboardAPI(state) as KeyboardAPI;
        const macroApi = getMacroAPI(protocol, api);
        if (macroApi) {
          const sequences = await macroApi.readRawKeycodeSequences();
          const macroBufferSize = await api.getMacroBufferSize();
          const macroCapacity = await api.getMacroCount();
          let macroCount = macroCapacity;
          let macroNames = Array.from(
            {length: macroCapacity},
            (_, index) => `Macro ${index + 1}`,
          );
          if (
            connectedDevice.vendorId === 0x6272 &&
            connectedDevice.productId === 0x2699
          ) {
            try {
              macroCount = Math.min(
                macroCapacity,
                await api.getTacxMacroCount(),
              );
              const savedNames = await Promise.all(
                Array.from({length: macroCount}, (_, index) =>
                  api.getTacxMacroName(index),
                ),
              );
              macroNames = macroNames.map(
                (fallback, index) => savedNames[index] || fallback,
              );
            } catch {
              macroCount = Math.min(10, macroCapacity);
            }
          }
          dispatch(
            loadMacrosSuccess({
              ast: sequences,
              macroBufferSize,
              macroCount,
              macroCapacity,
              macroNames,
            }),
          );
        }
      } catch (err) {
        dispatch(setMacrosNotSupported());
      }
    }
  };

export const saveMacroMetadata =
  (
    connectedDevice: ConnectedDevice,
    macroCount: number,
    macroNames: string[],
  ): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const api = getSelectedKeyboardAPI(state) as KeyboardAPI;
    const previousNames = state.macros.macroNames;
    const previousCount = state.macros.macroCount;
    dispatch(saveMacroMetadataSuccess({macroCount, macroNames}));
    if (
      connectedDevice.vendorId === 0x6272 &&
      connectedDevice.productId === 0x2699
    ) {
      await api.setTacxMacroCount(macroCount);
      const changedNames = macroNames
        .slice(0, macroCount)
        .map((name, index) => ({name, index}))
        .filter(
          ({name, index}) =>
            index >= previousCount || name !== previousNames[index],
        );
      await Promise.all(
        changedNames.map(({name, index}) => api.setTacxMacroName(index, name)),
      );
      await api.saveTacxMacroMetadata();
    }
  };

export const saveMacros =
  (connectedDevice: ConnectedDevice, macros: string[]): AppThunk =>
  async (dispatch, getState) => {
    const state = getState();
    const api = getSelectedKeyboardAPI(state) as KeyboardAPI;
    const {protocol} = connectedDevice;
    const macroApi = getMacroAPI(protocol, api);
    if (macroApi) {
      const sequences = macros.map((expression) => {
        const optimizedSequence = expressionToSequence(expression);
        const rawSequence = optimizedSequenceToRawSequence(optimizedSequence);
        return rawSequence;
      });
      await macroApi.writeRawKeycodeSequences(sequences);
      dispatch(saveMacrosSuccess({ast: sequences}));
    }
  };

export const getIsMacroFeatureSupported = (state: RootState) =>
  state.macros.isFeatureSupported;

export const getAST = (state: RootState) => state.macros.ast;
export const getMacroBufferSize = (state: RootState) =>
  state.macros.macroBufferSize;
export const getMacroCount = (state: RootState) => state.macros.macroCount;
export const getMacroCapacity = (state: RootState) =>
  state.macros.macroCapacity;
export const getMacroNames = (state: RootState) => state.macros.macroNames;

export const getExpressions = createSelector(getAST, (sequences) =>
  sequences.map((sequence) => {
    const optimizedSequence = rawSequenceToOptimizedSequence(sequence);
    const expression = sequenceToExpression(optimizedSequence);
    return expression;
  }),
);

export const getIsDelaySupported = createSelector(
  getSelectedConnectedDevice,
  (device) => !!device && isDelaySupported(device.protocol),
);
