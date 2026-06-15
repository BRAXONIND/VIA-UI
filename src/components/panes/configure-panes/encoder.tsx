import {FC, useEffect, useState} from 'react';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBrush,
  faCube,
  faFilm,
  faMagnifyingGlass,
  faMusic,
  faRotateLeft,
  faSun,
  faTableColumns,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import {SpanOverflowCell} from '../grid';
import {CenterPane} from '../pane';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from 'src/store/hooks';
import {PelpiKeycodeInput} from 'src/components/inputs/pelpi/keycode-input';
import {
  getBasicKeyToByte,
  getSelectedKeyDefinitions,
} from 'src/store/definitionsSlice';
import {
  getSelectedKey,
  getSelectedKeymap,
  getSelectedLayerIndex,
  updateKey,
} from 'src/store/keymapSlice';
import type {VIAKey} from '@the-via/reader';
import {
  getSelectedConnectedDevice,
  getSelectedKeyboardAPI,
} from 'src/store/devicesSlice';
import {KeyboardAPI} from 'src/utils/keyboard-api';
import {ErrorMessage} from 'src/components/styled';
import {getByteForCode} from 'src/utils/key';

const Encoder = styled(CenterPane)`
  min-height: 100%;
  background: var(--color_dark_grey);
`;

const Container = styled.div`
  width: min(1050px, calc(100% - 32px));
  margin: 0 auto;
  padding: 22px 0 34px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
`;

const EncoderIdentity = styled.div`
  color: var(--color_label-highlighted);
  font-size: 18px;
  font-weight: 700;
`;

const EncoderSubtitle = styled.span`
  margin-left: 9px;
  color: var(--color_label);
  font-size: 12px;
  font-weight: 500;
`;

const LayerBar = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 42px);
  gap: 5px;
`;

const LayerButton = styled.button<{$selected: boolean}>`
  height: 34px;
  border: 1px solid
    ${(props) =>
      props.$selected ? 'var(--color_accent)' : 'var(--border_color_cell)'};
  border-radius: 4px;
  color: ${(props) =>
    props.$selected ? 'var(--color_inside-accent)' : 'var(--color_label)'};
  background: ${(props) =>
    props.$selected ? 'var(--color_accent)' : 'var(--bg_control)'};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const DirectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const DirectionControl = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  min-height: 68px;
  padding: 10px 12px;
  border: 1px solid var(--border_color_cell);
  border-radius: 6px;
  background: var(--bg_menu);
`;

const DirectionIcon = styled.div`
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border_color_cell);
  border-radius: 50%;
  color: var(--color_accent);
  background: var(--bg_control);
`;

const DirectionText = styled.div`
  min-width: 0;
`;

const DirectionTitle = styled.div`
  color: var(--color_label-highlighted);
  font-size: 14px;
  font-weight: 700;
`;

const DirectionHint = styled.div`
  margin-top: 2px;
  color: var(--color_label);
  font-size: 11px;
`;

const PressRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 52px;
  padding: 0 12px;
  margin-bottom: 24px;
  border-top: 1px solid var(--border_color_cell);
  border-bottom: 1px solid var(--border_color_cell);
  color: var(--color_label);
`;

const SectionTitle = styled.div`
  margin-bottom: 10px;
  color: var(--color_label);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(145px, 1fr));
  gap: 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, minmax(135px, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
`;

const PresetButton = styled.button`
  min-height: 52px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border_color_cell);
  border-radius: 5px;
  padding: 7px 10px;
  color: var(--color_label);
  background: var(--bg_control);
  text-align: left;
  cursor: pointer;

  svg {
    color: var(--color_accent);
  }

  &:hover {
    border-color: var(--color_accent);
    color: var(--color_label-highlighted);
    background: var(--bg_icon);
  }
`;

const PresetName = styled.span`
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
`;

type Preset = {
  name: string;
  ccw: string;
  cw: string;
  icon: typeof faVolumeHigh;
};

const presets: Preset[] = [
  {name: 'Volume', ccw: 'KC_VOLD', cw: 'KC_VOLU', icon: faVolumeHigh},
  {
    name: 'Windows Zoom',
    ccw: 'C(KC_MINS)',
    cw: 'C(KC_EQL)',
    icon: faMagnifyingGlass,
  },
  {
    name: 'macOS Zoom',
    ccw: 'G(KC_MINS)',
    cw: 'G(KC_EQL)',
    icon: faMagnifyingGlass,
  },
  {name: 'Brightness', ccw: 'KC_BRID', cw: 'KC_BRIU', icon: faSun},
  {
    name: 'Vertical Scroll',
    ccw: 'KC_MS_WH_DOWN',
    cw: 'KC_MS_WH_UP',
    icon: faTableColumns,
  },
  {
    name: 'Horizontal Scroll',
    ccw: 'KC_MS_WH_LEFT',
    cw: 'KC_MS_WH_RIGHT',
    icon: faTableColumns,
  },
  {name: 'Pages', ccw: 'KC_PGDN', cw: 'KC_PGUP', icon: faTableColumns},
  {name: 'Previous / Next', ccw: 'KC_LEFT', cw: 'KC_RGHT', icon: faArrowRight},
  {name: 'Tabs', ccw: 'C(S(KC_TAB))', cw: 'C(KC_TAB)', icon: faTableColumns},
  {name: 'Undo / Redo', ccw: 'C(KC_Z)', cw: 'C(KC_Y)', icon: faRotateLeft},
  {name: 'Brush Size', ccw: 'KC_LBRC', cw: 'KC_RBRC', icon: faBrush},
  {
    name: 'Adobe Brush Hardness',
    ccw: 'S(KC_LBRC)',
    cw: 'S(KC_RBRC)',
    icon: faBrush,
  },
  {
    name: 'Adobe Canvas Zoom',
    ccw: 'C(KC_MINS)',
    cw: 'C(KC_EQL)',
    icon: faBrush,
  },
  {name: 'Media Track', ccw: 'KC_MPRV', cw: 'KC_MNXT', icon: faMusic},
  {name: 'Media Seek', ccw: 'KC_MRWD', cw: 'KC_MFFD', icon: faMusic},
  {name: 'Timeline Jog', ccw: 'KC_LEFT', cw: 'KC_RGHT', icon: faFilm},
  {name: 'Frame Nudge', ccw: 'S(KC_LEFT)', cw: 'S(KC_RGHT)', icon: faFilm},
  {
    name: 'Premiere Timeline Zoom',
    ccw: 'KC_MINS',
    cw: 'KC_EQL',
    icon: faFilm,
  },
  {
    name: 'Premiere Clip Nudge',
    ccw: 'A(KC_LEFT)',
    cw: 'A(KC_RGHT)',
    icon: faFilm,
  },
  {
    name: 'DaVinci Timeline Zoom',
    ccw: 'C(KC_MINS)',
    cw: 'C(KC_EQL)',
    icon: faFilm,
  },
  {
    name: 'DaVinci Frame Step',
    ccw: 'KC_LEFT',
    cw: 'KC_RGHT',
    icon: faFilm,
  },
  {
    name: 'DaVinci Clip Nudge',
    ccw: 'A(KC_LEFT)',
    cw: 'A(KC_RGHT)',
    icon: faFilm,
  },
  {
    name: 'Figma Zoom',
    ccw: 'C(KC_MINS)',
    cw: 'C(KC_EQL)',
    icon: faCube,
  },
  {
    name: 'Figma Layer Order',
    ccw: 'C(KC_LBRC)',
    cw: 'C(KC_RBRC)',
    icon: faCube,
  },
  {
    name: 'Figma Nudge',
    ccw: 'S(KC_LEFT)',
    cw: 'S(KC_RGHT)',
    icon: faCube,
  },
  {name: 'Blender Zoom', ccw: 'KC_MS_WH_DOWN', cw: 'KC_MS_WH_UP', icon: faCube},
  {name: 'Blender Orbit X', ccw: 'KC_P4', cw: 'KC_P6', icon: faCube},
  {name: 'Blender Orbit Y', ccw: 'KC_P2', cw: 'KC_P8', icon: faCube},
  {name: 'Blender Roll', ccw: 'KC_P7', cw: 'KC_P9', icon: faCube},
  {
    name: 'Desktop Switch',
    ccw: 'C(G(KC_LEFT))',
    cw: 'C(G(KC_RGHT))',
    icon: faArrowLeft,
  },
];

export const Pane: FC = () => {
  const {t} = useTranslation();
  const [cwValue, setCWValue] = useState<number>();
  const [ccwValue, setCCWValue] = useState<number>();
  const selectedKey = useAppSelector(getSelectedKey);
  const dispatch = useAppDispatch();
  const keys: (VIAKey & {ei?: number})[] = useAppSelector(
    getSelectedKeyDefinitions,
  );
  const matrixKeycodes = useAppSelector(
    (state) => getSelectedKeymap(state) || [],
  );
  const selectedLayer = useAppSelector(getSelectedLayerIndex);
  const [editLayer, setEditLayer] = useState(selectedLayer);
  const selectedDevice = useAppSelector(getSelectedConnectedDevice);
  const api = useAppSelector(getSelectedKeyboardAPI);
  const {basicKeyToByte} = useAppSelector(getBasicKeyToByte);
  const val = matrixKeycodes[selectedKey ?? -1];
  const encoderKey = keys[selectedKey ?? -1];
  const canClick =
    !!encoderKey && encoderKey.col !== -1 && encoderKey.row !== -1;

  useEffect(() => setEditLayer(selectedLayer), [selectedLayer]);

  const setEncoderValue = (type: 'ccw' | 'cw' | 'click', value: number) => {
    if (
      api &&
      selectedKey !== null &&
      encoderKey &&
      encoderKey.ei !== undefined
    ) {
      const encoderId = +encoderKey.ei;
      if (type === 'ccw') {
        api.setEncoderValue(editLayer, encoderId, false, value);
        setCCWValue(value);
      } else if (type === 'cw') {
        api.setEncoderValue(editLayer, encoderId, true, value);
        setCWValue(value);
      } else {
        dispatch(updateKey(selectedKey, value));
      }
    }
  };

  const applyPreset = async (preset: Preset) => {
    if (!api || encoderKey?.ei === undefined) {
      return;
    }
    const encoderId = +encoderKey.ei;
    const ccw = getByteForCode(preset.ccw, basicKeyToByte);
    const cw = getByteForCode(preset.cw, basicKeyToByte);
    await Promise.all([
      api.setEncoderValue(editLayer, encoderId, false, ccw),
      api.setEncoderValue(editLayer, encoderId, true, cw),
    ]);
    setCCWValue(ccw);
    setCWValue(cw);
  };

  useEffect(() => {
    if (
      selectedDevice &&
      selectedDevice.protocol >= 10 &&
      encoderKey?.ei !== undefined &&
      api
    ) {
      const encoderId = +encoderKey.ei;
      setCWValue(undefined);
      setCCWValue(undefined);
      Promise.all([
        api.getEncoderValue(editLayer, encoderId, true),
        api.getEncoderValue(editLayer, encoderId, false),
      ]).then(([cw, ccw]) => {
        setCWValue(cw);
        setCCWValue(ccw);
      });
    }
  }, [encoderKey, selectedDevice, editLayer, api]);

  if (
    encoderKey === undefined ||
    (selectedDevice && selectedDevice.protocol < 10)
  ) {
    return (
      <SpanOverflowCell>
        <ErrorMessage>
          {t(
            'Your current firmware does not support rotary encoders. Install the latest firmware for your device.',
          )}
        </ErrorMessage>
      </SpanOverflowCell>
    );
  }

  if (ccwValue === undefined || cwValue === undefined) {
    return (
      <SpanOverflowCell>
        <Encoder />
      </SpanOverflowCell>
    );
  }

  return (
    <SpanOverflowCell>
      <Encoder>
        <Container>
          <Header>
            <EncoderIdentity>
              EN{Number(encoderKey.ei) + 1}
              <EncoderSubtitle>Live encoder mapping</EncoderSubtitle>
            </EncoderIdentity>
            <LayerBar>
              {Array.from({length: 5}, (_, index) => (
                <LayerButton
                  type="button"
                  $selected={editLayer === index}
                  onClick={() => setEditLayer(index)}
                  key={index}
                >
                  L{index + 1}
                </LayerButton>
              ))}
            </LayerBar>
          </Header>

          <DirectionGrid>
            <DirectionControl>
              <DirectionIcon>
                <FontAwesomeIcon icon={faArrowLeft} />
              </DirectionIcon>
              <DirectionText>
                <DirectionTitle>Counterclockwise</DirectionTitle>
                <DirectionHint>Choose any keycode or macro</DirectionHint>
              </DirectionText>
              <PelpiKeycodeInput
                value={ccwValue}
                meta={{}}
                setValue={(value: number) => setEncoderValue('ccw', value)}
              />
            </DirectionControl>
            <DirectionControl>
              <DirectionIcon>
                <FontAwesomeIcon icon={faArrowRight} />
              </DirectionIcon>
              <DirectionText>
                <DirectionTitle>Clockwise</DirectionTitle>
                <DirectionHint>Choose any keycode or macro</DirectionHint>
              </DirectionText>
              <PelpiKeycodeInput
                value={cwValue}
                meta={{}}
                setValue={(value: number) => setEncoderValue('cw', value)}
              />
            </DirectionControl>
          </DirectionGrid>

          {canClick && (
            <PressRow>
              <span>Encoder press</span>
              <PelpiKeycodeInput
                value={val}
                meta={{}}
                setValue={(value: number) => setEncoderValue('click', value)}
              />
            </PressRow>
          )}

          <SectionTitle>Action presets</SectionTitle>
          <PresetGrid>
            {presets.map((preset) => (
              <PresetButton
                type="button"
                title={`${preset.ccw} / ${preset.cw}`}
                onClick={() => applyPreset(preset)}
                key={preset.name}
              >
                <FontAwesomeIcon icon={preset.icon} />
                <PresetName>{preset.name}</PresetName>
              </PresetButton>
            ))}
          </PresetGrid>
        </Container>
      </Encoder>
    </SpanOverflowCell>
  );
};
