import React, {useEffect, useRef, useState} from 'react';
import styled, {css, keyframes} from 'styled-components';
import {useAppDispatch, useAppSelector} from 'src/store/hooks';
import {
  getBasicKeyToByte,
  getSelectedDefinition,
} from 'src/store/definitionsSlice';
import {
  getSelectedLayerIndex,
  getSelectedRawLayers,
  setLayer,
} from 'src/store/keymapSlice';
import {getCodeForByte} from 'src/utils/key';
import {getSelectedKeyboardAPI} from 'src/store/devicesSlice';

const Editor = styled.div`
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 22px 0 30px;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
`;

const Heading = styled.div`
  color: var(--color_label-highlighted);
  font-size: 17px;
  font-weight: 700;
`;

const Subtitle = styled.div`
  margin-top: 3px;
  color: var(--color_label);
  font-size: 11px;
`;

const LayerTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 42px);
  gap: 5px;
`;

const LayerTab = styled.button<{$selected: boolean}>`
  height: 34px;
  border: 1px solid
    ${(props) =>
      props.$selected ? 'var(--color_accent)' : 'var(--border_color_cell)'};
  border-radius: 4px;
  color: ${(props) =>
    props.$selected ? 'var(--color_inside-accent)' : 'var(--color_label)'};
  background: ${(props) =>
    props.$selected ? 'var(--color_accent)' : 'var(--bg_control)'};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;

const IdentityGrid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr minmax(220px, 1.1fr);
  gap: 10px;
  margin-bottom: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const DisplaySurface = styled.div`
  position: relative;
  padding: 16px;
  border: 1px solid var(--border_color_cell);
  border-radius: 6px;
  background: var(--bg_menu);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, white 3%, transparent);
`;

const SurfaceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: var(--color_label);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const LiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color_label-highlighted);

  &::before {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color_accent);
    content: '';
  }
`;

const KeyGrid = styled.div`
  display: grid;
  grid-template-columns: 28px repeat(4, minmax(95px, 1fr));
  gap: 9px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 22px repeat(4, minmax(64px, 1fr));
    gap: 6px;
  }
`;

const AxisLabel = styled.div`
  color: var(--color_label);
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  opacity: 0.65;
`;

const MappingCell = styled.div`
  min-width: 0;
  height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border_color_cell);
  border-radius: 5px;
  background: var(--bg_control);
  overflow: hidden;
`;

const MappingCode = styled.div`
  max-width: calc(100% - 12px);
  margin-top: 4px;
  color: var(--color_label);
  font-family: monospace;
  font-size: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Field = styled.label`
  min-width: 0;
  display: block;
`;

const FieldLabel = styled.span`
  display: block;
  margin: 0 0 6px 2px;
  color: var(--color_label);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.72;
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  22% { transform: translateX(-4px); }
  48% { transform: translateX(3px); }
  72% { transform: translateX(-2px); }
`;

const Input = styled.input<{$invalid?: boolean}>`
  width: 100%;
  height: 39px;
  box-sizing: border-box;
  border: 1px solid var(--border_color_cell);
  border-radius: 4px;
  padding: 0 10px;
  color: var(--color_label-highlighted);
  background: var(--bg_control);
  font: inherit;
  font-size: 14px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--color_accent);
    box-shadow: 0 0 0 2px
      color-mix(in srgb, var(--color_accent) 18%, transparent);
  }

  ${(props) =>
    props.$invalid &&
    css`
      border-color: #dc6a6a;
      animation: ${shake} 460ms ease-out;
    `}
`;

const FocusCard = styled.div`
  min-width: 0;
`;

const FocusRow = styled.div`
  display: grid;
  grid-template-columns: minmax(68px, 0.7fr) repeat(3, minmax(62px, 1fr));
  gap: 7px;
`;

const FocusButton = styled.button<{$primary?: boolean}>`
  height: 39px;
  min-width: 0;
  border: 1px solid
    ${(props) =>
      props.$primary ? 'var(--color_accent)' : 'var(--border_color_cell)'};
  border-radius: 4px;
  padding: 0 8px;
  color: ${(props) =>
    props.$primary
      ? 'var(--color_inside-accent)'
      : 'var(--color_label-highlighted)'};
  background: ${(props) =>
    props.$primary ? 'var(--color_accent)' : 'var(--bg_control)'};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--color_accent);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

type KeyLabelCellProps = {
  code: string;
  value: string;
  onSave: (value: string) => void;
};

const KeyLabelCell = ({code, value, onSave}: KeyLabelCellProps) => {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setDraft(value), [value]);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const showLimit = () => {
    setInvalid(false);
    requestAnimationFrame(() => setInvalid(true));
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setInvalid(false), 520);
  };

  return (
    <MappingCell title={code}>
      <Input
        $invalid={invalid}
        aria-label={`${code} display text`}
        maxLength={7}
        value={draft}
        placeholder={code.replace('KC_', '').slice(0, 7)}
        spellCheck={false}
        onChange={(event) => {
          if (event.target.value.length >= 7 && draft.length >= 7) {
            showLimit();
          }
          setDraft(event.target.value.slice(0, 7));
        }}
        onBlur={() => {
          if (draft !== value) {
            onSave(draft);
          }
        }}
        onKeyDown={(event) => {
          if (
            draft.length >= 7 &&
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            showLimit();
          }
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      <MappingCode>{code}</MappingCode>
    </MappingCell>
  );
};

const decodeText = (value: number[] = []) =>
  value
    .slice(0, value.indexOf(0) === -1 ? value.length : value.indexOf(0))
    .map((byte) => String.fromCharCode(byte))
    .join('');

type TextFieldProps = {
  label: string;
  name: string;
  command: number[];
  limit: number;
  value?: number[];
  updateValue: (name: string, ...command: number[]) => void;
};

const TextField = ({
  label,
  name,
  command,
  limit,
  value,
  updateValue,
}: TextFieldProps) => {
  const incoming = decodeText(value);
  const [draft, setDraft] = useState(incoming);
  const [invalid, setInvalid] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setDraft(incoming), [incoming]);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const showLimit = () => {
    setInvalid(false);
    requestAnimationFrame(() => setInvalid(true));
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setInvalid(false), 520);
  };

  const commit = () => {
    if (draft === incoming) {
      return;
    }
    const bytes = Array.from(draft, (character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code <= 126 ? code : 63;
    });
    updateValue(name, ...command, ...bytes, 0);
  };

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        $invalid={invalid}
        aria-label={label}
        maxLength={limit}
        value={draft}
        spellCheck={false}
        onChange={(event) => {
          if (event.target.value.length >= limit && draft.length >= limit) {
            showLimit();
          }
          setDraft(event.target.value.slice(0, limit));
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (
            draft.length >= limit &&
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            showLimit();
          }
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
    </Field>
  );
};

type Props = {
  selectedCustomMenuData: Record<string, number[]>;
  updateCustomMenuValue: (command: string, ...rest: number[]) => Promise<void>;
};

export const TacxDisplayEditor = ({
  selectedCustomMenuData,
  updateCustomMenuValue,
}: Props) => {
  const dispatch = useAppDispatch();
  const selectedLayer = useAppSelector(getSelectedLayerIndex);
  const [editLayer, setEditLayer] = useState(selectedLayer);
  const rawLayers = useAppSelector(getSelectedRawLayers);
  const definition = useAppSelector(getSelectedDefinition);
  const api = useAppSelector(getSelectedKeyboardAPI);
  const {basicKeyToByte, byteToKey} = useAppSelector(getBasicKeyToByte);
  const [keyLabels, setKeyLabels] = useState<string[][]>(
    Array.from({length: 3}, () => Array(4).fill('')),
  );
  const incomingMinutes = selectedCustomMenuData.tacx_focus_minutes?.[0] || 25;
  const incomingFocusState = selectedCustomMenuData.tacx_focus_start?.[0] || 0;
  const [focusMinutes, setFocusMinutes] = useState(incomingMinutes);
  const [focusState, setFocusState] = useState(incomingFocusState);
  const [isUpdatingFocus, setIsUpdatingFocus] = useState(false);
  const prefix = `tacx_text_l${editLayer}`;

  useEffect(() => setFocusMinutes(incomingMinutes), [incomingMinutes]);
  useEffect(() => setFocusState(incomingFocusState), [incomingFocusState]);
  useEffect(() => {
    let active = true;
    if (!api || typeof api === 'string') {
      return;
    }

    Promise.all(
      Array.from({length: 3}, (_, row) =>
        Promise.all(
          Array.from({length: 4}, (_, col) =>
            api.getTacxKeyLabel(editLayer, row, col),
          ),
        ),
      ),
    ).then((labels) => {
      if (active) {
        setKeyLabels(labels);
      }
    });

    return () => {
      active = false;
    };
  }, [api, editLayer]);

  const field = (
    label: string,
    suffix: string,
    command: number[],
    limit: number,
  ) => (
    <TextField
      label={label}
      name={`${prefix}_${suffix}`}
      command={command}
      limit={limit}
      value={selectedCustomMenuData[`${prefix}_${suffix}`]}
      updateValue={updateCustomMenuValue}
    />
  );

  const mapping = (row: number, col: number) => {
    const cols =
      definition && typeof definition !== 'string' ? definition.matrix.cols : 4;
    const matrixRow = row + 1;
    const byte = rawLayers[editLayer]?.keymap[matrixRow * cols + col] ?? 0;
    const code = getCodeForByte(byte, basicKeyToByte, byteToKey) || 'KC_NO';
    return {code};
  };

  const saveKeyLabel = async (row: number, col: number, label: string) => {
    setKeyLabels((current) =>
      current.map((line, lineIndex) =>
        lineIndex === row
          ? line.map((value, colIndex) => (colIndex === col ? label : value))
          : line,
      ),
    );
    if (api && typeof api !== 'string') {
      await api.setTacxKeyLabel(editLayer, row, col, label);
    }
  };

  const saveFocusMinutes = async () => {
    const value = Math.max(1, Math.min(99, focusMinutes || 1));
    setFocusMinutes(value);
    await updateCustomMenuValue('tacx_focus_minutes', 66, 50, value);
  };

  const setFocusAction = async (action: 0 | 1 | 2) => {
    setIsUpdatingFocus(true);
    try {
      if (action === 1 && focusState === 0) {
        await saveFocusMinutes();
      }
      await updateCustomMenuValue('tacx_focus_start', 66, 51, action);
      setFocusState(action);
    } finally {
      setIsUpdatingFocus(false);
    }
  };

  return (
    <Editor>
      <Toolbar>
        <div>
          <Heading>Display Surface</Heading>
          <Subtitle>Live mappings from the connected TAC-X</Subtitle>
        </div>
        <LayerTabs>
          {Array.from({length: 5}, (_, index) => (
            <LayerTab
              type="button"
              $selected={editLayer === index}
              onClick={() => {
                setEditLayer(index);
                dispatch(setLayer(index));
              }}
              key={index}
            >
              L{index + 1}
            </LayerTab>
          ))}
        </LayerTabs>
      </Toolbar>

      <IdentityGrid>
        {field('Layer name', 'name', [66, 18, editLayer, 165], 7)}
        {field('Encoder 1', 'en1', [66, 19, editLayer, 0, 165], 7)}
        {field('Encoder 2', 'en2', [66, 19, editLayer, 1, 165], 7)}
        <FocusCard>
          <FieldLabel>Focus timer</FieldLabel>
          <FocusRow>
            <Input
              aria-label="Focus timer minutes"
              type="number"
              min={1}
              max={99}
              value={focusMinutes}
              onChange={(event) =>
                setFocusMinutes(Number(event.target.value.slice(0, 2)))
              }
              onBlur={saveFocusMinutes}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
            />
            <FocusButton
              $primary={focusState !== 1}
              type="button"
              disabled={isUpdatingFocus || focusState === 1}
              onClick={() => void setFocusAction(1)}
            >
              {focusState === 2 ? 'RESUME' : 'START'}
            </FocusButton>
            <FocusButton
              type="button"
              disabled={isUpdatingFocus || focusState !== 1}
              onClick={() => void setFocusAction(2)}
            >
              PAUSE
            </FocusButton>
            <FocusButton
              type="button"
              disabled={isUpdatingFocus || focusState === 0}
              onClick={() => void setFocusAction(0)}
            >
              STOP
            </FocusButton>
          </FocusRow>
        </FocusCard>
      </IdentityGrid>

      <DisplaySurface>
        <SurfaceHeader>
          <span>3 x 4 display text</span>
          <LiveBadge>Device data</LiveBadge>
        </SurfaceHeader>
        <KeyGrid>
          <div />
          {Array.from({length: 4}, (_, col) => (
            <AxisLabel key={`col-${col}`}>C{col + 1}</AxisLabel>
          ))}
          {Array.from({length: 3}, (_, row) => (
            <React.Fragment key={`row-${row}`}>
              <AxisLabel>R{row + 1}</AxisLabel>
              {Array.from({length: 4}, (_, col) => {
                const key = mapping(row, col);
                return (
                  <KeyLabelCell
                    code={key.code}
                    value={keyLabels[row]?.[col] || ''}
                    onSave={(label) => saveKeyLabel(row, col, label)}
                    key={`${row}-${col}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </KeyGrid>
      </DisplaySurface>
    </Editor>
  );
};
