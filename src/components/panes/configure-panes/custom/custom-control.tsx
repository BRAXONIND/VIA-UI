import React, {useEffect, useRef, useState} from 'react';
import styled, {css, keyframes} from 'styled-components';
import {PelpiKeycodeInput} from '../../../inputs/pelpi/keycode-input';
import {AccentButton} from '../../../inputs/accent-button';
import {AccentSlider} from '../../../inputs/accent-slider';
import {AccentSelect} from '../../../inputs/accent-select';
import {AccentRange} from '../../../inputs/accent-range';
import {ControlRow, Label, Detail} from '../../grid';
import type {VIADefinitionV2, VIADefinitionV3, VIAItem} from '@the-via/reader';
import type {LightingData} from '../../../../types/types';
import {ArrayColorPicker} from '../../../inputs/color-picker';
import {ConnectedColorPalettePicker} from 'src/components/inputs/color-palette-picker';
import {shiftFrom16Bit, shiftTo16Bit} from 'src/utils/keyboard-api';
import {useTranslation} from 'react-i18next';

type Props = {
  lightingData: LightingData;
  definition: VIADefinitionV2 | VIADefinitionV3;
};

type ControlMeta = [
  string | React.FC<AdvancedControlProps>,
  {type: string} & Partial<{
    min: number;
    max: number;
    getOptions: (d: VIADefinitionV2 | VIADefinitionV3) => string[];
  }>,
];

type AdvancedControlProps = Props & {meta: ControlMeta};

export const VIACustomItem = React.memo(
  (props: VIACustomControlProps & {_id: string}) => {
    const {t} = useTranslation();
    return (
      <ControlRow id={props._id}>
        <Label>{t(props.label)}</Label>
        <Detail>
          {'type' in props ? (
            <VIACustomControl
              {...props}
              value={props.value && Array.from(props.value)}
            />
          ) : (
            props.content
          )}
        </Detail>
      </ControlRow>
    );
  },
);

type ControlGetSet = {
  value: number[];
  updateValue: (name: string, ...command: number[]) => void;
};

type VIACustomControlProps = VIAItem & ControlGetSet;

const boxOrArr = <N extends any>(elem: N | N[]) =>
  Array.isArray(elem) ? elem : [elem];

// we can compare value against option[1], that way corrupted values are false
const valueIsChecked = (option: number | number[], value: number[]) =>
  boxOrArr(option).every((o, i) => o == value[i]);

const getRangeValue = (value: number[], max: number) => {
  if (max > 255) {
    return shiftTo16Bit([value[0], value[1]]);
  } else {
    return value[0];
  }
};

const getRangeBytes = (value: number, max: number) => {
  if (max > 255) {
    return shiftFrom16Bit(value);
  } else {
    return [value];
  }
};

const inputShake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  55% { transform: translateX(4px); }
  80% { transform: translateX(-2px); }
`;

const TextFieldWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TextField = styled.input<{$invalid: boolean}>`
  width: min(320px, 34vw);
  height: 34px;
  box-sizing: border-box;
  border: 1px solid var(--border_color_cell);
  border-radius: 5px;
  padding: 0 10px;
  color: var(--color_label-highlighted);
  background: var(--bg_menu);
  font: inherit;
  font-size: 15px;
  line-height: 34px;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease;

  &:focus {
    outline: none;
    border-color: var(--color_accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color_accent) 20%, transparent);
  }

  ${(props) =>
    props.$invalid &&
    css`
      border-color: #e76666;
      animation: ${inputShake} 280ms ease-out;
    `}
`;

const TextCount = styled.span`
  min-width: 42px;
  color: var(--color_label);
  font-size: 12px;
  line-height: 1;
  text-align: right;
  opacity: 0.72;
`;

const decodeText = (value: number[] = []) =>
  value
    .slice(0, value.indexOf(0) === -1 ? value.length : value.indexOf(0))
    .map((byte) => String.fromCharCode(byte))
    .join('');

const textLimitForCommand = (command: number[]) => {
  switch (command[1]) {
    case 0x10:
    case 0x11:
      return 6;
    case 0x12:
    case 0x13:
      return 7;
    case 0x40:
      return 27;
    default:
      return 7;
  }
};

const VIATextControl = (props: VIACustomControlProps) => {
  const {content} = props as any;
  const [name, ...command] = content;
  const maxLength = textLimitForCommand(command);
  const incoming = decodeText(props.value);
  const [draft, setDraft] = useState(incoming);
  const [invalid, setInvalid] = useState(false);
  const invalidTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setDraft(incoming), [incoming]);
  useEffect(
    () => () => {
      if (invalidTimer.current) {
        clearTimeout(invalidTimer.current);
      }
    },
    [],
  );

  const showLimitFeedback = () => {
    setInvalid(false);
    requestAnimationFrame(() => setInvalid(true));
    if (invalidTimer.current) {
      clearTimeout(invalidTimer.current);
    }
    invalidTimer.current = setTimeout(() => setInvalid(false), 320);
  };

  const commit = () => {
    if (draft === incoming) {
      return;
    }
    const bytes = Array.from(draft, (char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? code : 63;
    });
    props.updateValue(name, ...command, ...bytes, 0);
  };

  return (
    <TextFieldWrap>
      <TextField
        $invalid={invalid}
        aria-label={props.label}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          if (next.length > maxLength) {
            showLimitFeedback();
          }
          setDraft(next.slice(0, maxLength));
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
      />
      <TextCount>
        {draft.length}/{maxLength}
      </TextCount>
    </TextFieldWrap>
  );
};

const VIACustomControl = (props: VIACustomControlProps) => {
  const {t} = useTranslation();
  const {content, type, options, value} = props as any;
  const [name, ...command] = content;
  if (name.startsWith('tacx_text_')) {
    return <VIATextControl {...props} />;
  }
  switch (type) {
    case 'button': {
      const buttonOption: any[] = options || [1];
      return (
        <AccentButton
          onClick={() => props.updateValue(name, ...command, buttonOption[0])}
        >
          {t('Click')}
        </AccentButton>
      );
    }
    case 'range': {
      return (
        <AccentRange
          min={options[0]}
          max={options[1]}
          defaultValue={getRangeValue(props.value, options[1])}
          onChange={(val: number) =>
            props.updateValue(
              name,
              ...command,
              ...getRangeBytes(val, options[1]),
            )
          }
        />
      );
    }
    case 'keycode': {
      return (
        <PelpiKeycodeInput
          value={shiftTo16Bit([props.value[0], props.value[1]])}
          meta={{}}
          setValue={(val: number) =>
            props.updateValue(name, ...command, ...shiftFrom16Bit(val))
          }
        />
      );
    }
    case 'toggle': {
      const toggleOptions: any[] = options || [0, 1];
      return (
        <AccentSlider
          isChecked={valueIsChecked(toggleOptions[1], props.value)}
          onChange={(val) =>
            props.updateValue(
              name,
              ...command,
              ...boxOrArr(toggleOptions[+val]),
            )
          }
        />
      );
    }
    case 'dropdown': {
      const selectOptions = options.map(
        (option: [string, number] | string, idx: number) => {
          const [label, value] =
            typeof option === 'string' ? [option, idx] : option;
          return {
            value: value || idx,
            label: t(label),
          };
        },
      );
      return (
        <AccentSelect
          /*width={250}*/
          onChange={(option: any) =>
            option && props.updateValue(name, ...command, +option.value)
          }
          options={selectOptions}
          value={selectOptions.find((p: any) => value[0] === p.value)}
        />
      );
    }
    case 'color': {
      return (
        <ArrayColorPicker
          color={props.value as [number, number]}
          setColor={(hue, sat) => props.updateValue(name, ...command, hue, sat)}
        />
      );
    }
    case 'color-palette': {
      return <ConnectedColorPalettePicker />;
    }
  }
  return null;
};
