import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components';
import {MacroRecorder} from './macro-recorder';
import {useAppSelector} from 'src/store/hooks';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faClapperboard,
  faCode,
  faCopy,
  faFolderOpen,
  faPaste,
  faRocket,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import {ScriptMode} from './script-mode';
import {ProgressBarTooltip} from 'src/components/inputs/tooltip';
import {getIsDelaySupported, getMacroBufferSize} from 'src/store/macrosSlice';
import {
  getSelectedConnectedDevice,
  getSelectedKeyboardAPI,
} from 'src/store/devicesSlice';
import {getMacroAPI, getMacroValidator} from 'src/utils/macro-api';
import {useTranslation} from 'react-i18next';
import {AccentButton} from 'src/components/inputs/accent-button';

const ProgressBarContainer = styled.div`
  position: relative;
  margin-top: 10px;
  &:hover {
    & .tooltip {
      transform: scale(1) translateY(0px);
      opacity: 1;
    }
  }
  .tooltip {
    transform: translateY(5px) scale(0.6);
    opacity: 0;
  }
`;
const ProgressBar = styled.div`
  background: var(--bg_control);
  position: relative;
  padding: 5px;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
  cursor: pointer;
  width: 250px;

  > span {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    background: var(--color_accent);
    height: 10px;
    width: 100%;
    transform: scaleX(0.1);
    transform-origin: left;
    transition: transform 0.4s ease-in-out;
  }
`;
const MacroTab = styled.span<{$selected: boolean}>`
  display: inline-flex;
  border: 1px solid;
  line-height: initial;
  border-top: none;
  padding: 8px;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  min-width: 38px;
  justify-content: center;
  box-sizing: border-box;
  color: ${(props) =>
    props.$selected ? 'var(--color_accent)' : 'var(--bg_icon)'};
  cursor: pointer;
  &:hover {
    color: ${(props) =>
      props.$selected ? 'var(--color_accent)' : 'var(--bg_icon-highlighted)'};
  }
`;

const TabBar = styled.div`
  display: flex;
  column-gap: 10px;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 10px;
  width: 100%;
  max-width: 960px;
`;
const CenterTabContainer = styled(TabContainer)`
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

const LaunchPanel = styled.div`
  width: min(100%, 1040px);
  margin-top: 18px;
  padding: 20px;
  box-sizing: border-box;
  border: 1px solid var(--border_color_cell);
  border-radius: 6px;
  background: var(--bg_menu);
`;

const LaunchGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(420px, 0.95fr) minmax(400px, 1.05fr);
  gap: 24px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const LaunchSection = styled.div`
  min-width: 0;
`;

const LaunchLabel = styled.label`
  display: block;
  margin-bottom: 9px;
  color: var(--color_label);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
`;

const LaunchRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px 88px;
  gap: 10px;
`;

const LauncherIconButton = styled(AccentButton)`
  width: 48px;
  min-width: 48px;
  height: 44px;
  padding: 0;
  line-height: 44px;
  font-size: 17px;
`;

const LauncherSaveButton = styled(AccentButton)`
  width: 88px;
  min-width: 88px;
  height: 44px;
  padding: 0 12px;
  line-height: 44px;
  font-size: 13px;
  font-weight: 700;
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 8px;
  max-height: 390px;
  padding-right: 4px;
  overflow-y: auto;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const QuickItem = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  min-height: 50px;
  min-height: 40px;
  border: 1px solid var(--border_color_cell);
  border-radius: 5px;
  overflow: hidden;
  background: var(--bg_control);

  &:hover {
    border-color: var(--color_accent);
  }
`;

const QuickButton = styled.button`
  min-width: 0;
  border: 0;
  padding: 7px 10px;
  color: var(--color_label);
  background: var(--bg_control);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--color_label-highlighted);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

const QuickShortcut = styled.span`
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--color_label);
  font-family: 'Source Code Pro', monospace;
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
`;

const QuickCopyButton = styled.button`
  width: 36px;
  border: 0;
  border-left: 1px solid var(--border_color_cell);
  color: var(--color_label);
  background: var(--bg_control);
  cursor: pointer;

  &:hover {
    color: var(--color_accent);
    background: var(--bg_menu);
  }
`;

const QuickToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px auto;
  gap: 8px;
  margin-bottom: 10px;
`;

const QuickSearchWrap = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 50%;
    left: 11px;
    color: var(--color_label);
    transform: translateY(-50%);
    pointer-events: none;
  }
`;

const QuickSearch = styled.input`
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  border: 1px solid var(--border_color_icon);
  border-radius: 5px;
  padding: 0 10px 0 32px;
  color: var(--color_label-highlighted);
  background: var(--bg_control);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--color_accent);
  }
`;

const QuickCategory = styled.select`
  height: 36px;
  border: 1px solid var(--border_color_icon);
  border-radius: 5px;
  padding: 0 8px;
  color: var(--color_label-highlighted);
  background: var(--bg_control);
  font: inherit;

  &:focus {
    outline: none;
    border-color: var(--color_accent);
  }
`;

const QuickStatus = styled.div<{$error: boolean}>`
  min-height: 18px;
  margin-top: 8px;
  color: ${(props) =>
    props.$error ? 'var(--color_error)' : 'var(--color_accent)'};
  font-size: 11px;
`;

const ClipboardBar = styled.div`
  display: flex;
  gap: 6px;
`;

const UtilityButton = styled.button`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border_color_cell);
  border-radius: 4px;
  color: var(--color_label);
  background: var(--bg_control);
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--color_accent);
    color: var(--color_accent);
  }

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }
`;

const LaunchInput = styled.input`
  min-width: 0;
  height: 44px;
  box-sizing: border-box;
  border: 1px solid var(--border_color_icon);
  border-radius: 5px;
  padding: 0 12px;
  color: var(--color_label-highlighted);
  background: var(--bg_control);
  font: inherit;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--color_accent);
  }
`;

type Props = {
  macroExpressions: string[];
  selectedMacro: number;
  saveMacros: (macro: string) => Promise<void>;
  protocol: number;
};

type QuickAction = {
  category: 'Editing' | 'Browser' | 'Windows';
  label: string;
  shortcut: string;
  expression: string;
};

const quickActions: QuickAction[] = [
  {
    category: 'Editing',
    label: 'Copy',
    shortcut: 'Ctrl + C',
    expression: '{KC_LCTL,KC_C}',
  },
  {
    category: 'Editing',
    label: 'Paste',
    shortcut: 'Ctrl + V',
    expression: '{KC_LCTL,KC_V}',
  },
  {
    category: 'Editing',
    label: 'Cut',
    shortcut: 'Ctrl + X',
    expression: '{KC_LCTL,KC_X}',
  },
  {
    category: 'Editing',
    label: 'Undo',
    shortcut: 'Ctrl + Z',
    expression: '{KC_LCTL,KC_Z}',
  },
  {
    category: 'Editing',
    label: 'Redo',
    shortcut: 'Ctrl + Y',
    expression: '{KC_LCTL,KC_Y}',
  },
  {
    category: 'Editing',
    label: 'Save',
    shortcut: 'Ctrl + S',
    expression: '{KC_LCTL,KC_S}',
  },
  {
    category: 'Editing',
    label: 'Save as',
    shortcut: 'Ctrl + Shift + S',
    expression: '{KC_LCTL,KC_LSFT,KC_S}',
  },
  {
    category: 'Editing',
    label: 'Select all',
    shortcut: 'Ctrl + A',
    expression: '{KC_LCTL,KC_A}',
  },
  {
    category: 'Editing',
    label: 'Find',
    shortcut: 'Ctrl + F',
    expression: '{KC_LCTL,KC_F}',
  },
  {
    category: 'Editing',
    label: 'Replace',
    shortcut: 'Ctrl + H',
    expression: '{KC_LCTL,KC_H}',
  },
  {
    category: 'Editing',
    label: 'New document',
    shortcut: 'Ctrl + N',
    expression: '{KC_LCTL,KC_N}',
  },
  {
    category: 'Editing',
    label: 'Open file',
    shortcut: 'Ctrl + O',
    expression: '{KC_LCTL,KC_O}',
  },
  {
    category: 'Editing',
    label: 'Print',
    shortcut: 'Ctrl + P',
    expression: '{KC_LCTL,KC_P}',
  },
  {
    category: 'Editing',
    label: 'Bold',
    shortcut: 'Ctrl + B',
    expression: '{KC_LCTL,KC_B}',
  },
  {
    category: 'Editing',
    label: 'Italic',
    shortcut: 'Ctrl + I',
    expression: '{KC_LCTL,KC_I}',
  },
  {
    category: 'Editing',
    label: 'Delete permanently',
    shortcut: 'Shift + Delete',
    expression: '{KC_LSFT,KC_DEL}',
  },
  {
    category: 'Browser',
    label: 'New tab',
    shortcut: 'Ctrl + T',
    expression: '{KC_LCTL,KC_T}',
  },
  {
    category: 'Browser',
    label: 'Close tab',
    shortcut: 'Ctrl + W',
    expression: '{KC_LCTL,KC_W}',
  },
  {
    category: 'Browser',
    label: 'Reopen tab',
    shortcut: 'Ctrl + Shift + T',
    expression: '{KC_LCTL,KC_LSFT,KC_T}',
  },
  {
    category: 'Browser',
    label: 'Next tab',
    shortcut: 'Ctrl + Tab',
    expression: '{KC_LCTL,KC_TAB}',
  },
  {
    category: 'Browser',
    label: 'Previous tab',
    shortcut: 'Ctrl + Shift + Tab',
    expression: '{KC_LCTL,KC_LSFT,KC_TAB}',
  },
  {
    category: 'Browser',
    label: 'Address bar',
    shortcut: 'Ctrl + L',
    expression: '{KC_LCTL,KC_L}',
  },
  {
    category: 'Browser',
    label: 'Refresh',
    shortcut: 'Ctrl + R',
    expression: '{KC_LCTL,KC_R}',
  },
  {
    category: 'Browser',
    label: 'Hard refresh',
    shortcut: 'Ctrl + Shift + R',
    expression: '{KC_LCTL,KC_LSFT,KC_R}',
  },
  {
    category: 'Browser',
    label: 'Downloads',
    shortcut: 'Ctrl + J',
    expression: '{KC_LCTL,KC_J}',
  },
  {
    category: 'Browser',
    label: 'History',
    shortcut: 'Ctrl + H',
    expression: '{KC_LCTL,KC_H}',
  },
  {
    category: 'Browser',
    label: 'Zoom in',
    shortcut: 'Ctrl + =',
    expression: '{KC_LCTL,KC_EQL}',
  },
  {
    category: 'Browser',
    label: 'Zoom out',
    shortcut: 'Ctrl + -',
    expression: '{KC_LCTL,KC_MINS}',
  },
  {
    category: 'Browser',
    label: 'Reset zoom',
    shortcut: 'Ctrl + 0',
    expression: '{KC_LCTL,KC_0}',
  },
  {
    category: 'Browser',
    label: 'Full screen',
    shortcut: 'F11',
    expression: '{KC_F11}',
  },
  {
    category: 'Windows',
    label: 'Switch app',
    shortcut: 'Alt + Tab',
    expression: '{KC_LALT,KC_TAB}',
  },
  {
    category: 'Windows',
    label: 'Close app',
    shortcut: 'Alt + F4',
    expression: '{KC_LALT,KC_F4}',
  },
  {
    category: 'Windows',
    label: 'Lock PC',
    shortcut: 'Win + L',
    expression: '{KC_LGUI,KC_L}',
  },
  {
    category: 'Windows',
    label: 'File Explorer',
    shortcut: 'Win + E',
    expression: '{KC_LGUI,KC_E}',
  },
  {
    category: 'Windows',
    label: 'Settings',
    shortcut: 'Win + I',
    expression: '{KC_LGUI,KC_I}',
  },
  {
    category: 'Windows',
    label: 'Run',
    shortcut: 'Win + R',
    expression: '{KC_LGUI,KC_R}',
  },
  {
    category: 'Windows',
    label: 'Show desktop',
    shortcut: 'Win + D',
    expression: '{KC_LGUI,KC_D}',
  },
  {
    category: 'Windows',
    label: 'Screenshot',
    shortcut: 'Win + Shift + S',
    expression: '{KC_LGUI,KC_LSFT,KC_S}',
  },
  {
    category: 'Windows',
    label: 'Task Manager',
    shortcut: 'Ctrl + Shift + Esc',
    expression: '{KC_LCTL,KC_LSFT,KC_ESC}',
  },
  {
    category: 'Windows',
    label: 'Clipboard history',
    shortcut: 'Win + V',
    expression: '{KC_LGUI,KC_V}',
  },
  {
    category: 'Windows',
    label: 'Emoji panel',
    shortcut: 'Win + .',
    expression: '{KC_LGUI,KC_DOT}',
  },
  {
    category: 'Windows',
    label: 'Windows search',
    shortcut: 'Win + S',
    expression: '{KC_LGUI,KC_S}',
  },
  {
    category: 'Windows',
    label: 'Quick Link menu',
    shortcut: 'Win + X',
    expression: '{KC_LGUI,KC_X}',
  },
  {
    category: 'Windows',
    label: 'Project display',
    shortcut: 'Win + P',
    expression: '{KC_LGUI,KC_P}',
  },
];

const printBytesUsed = (bytesUsed: number, bufferSize: number) => {
  const {t} = useTranslation();
  const units = ['Bytes', 'kB', 'MB', 'GB'];
  const scale = Math.floor(Math.log10(bufferSize) / 3);
  const suffix = units[scale];
  const denominator = scale === 0 ? 1 : Math.pow(1000, scale);
  const convertedBytesUsed = bytesUsed / denominator;
  const convertedBufferSize = bufferSize / denominator;

  return `${convertedBytesUsed.toFixed(scale)} / ${convertedBufferSize.toFixed(
    scale,
  )} ${suffix} ${t('space used')}`;
};

const BufferSizeUsage = () => {
  const ast = useAppSelector((state) => state.macros.ast);
  const bufferSize = useAppSelector(getMacroBufferSize);
  const connectedDevice = useAppSelector(getSelectedConnectedDevice);
  const api = useAppSelector(getSelectedKeyboardAPI);
  if (!connectedDevice || !api) {
    return null;
  }
  const {protocol} = connectedDevice;
  const macroApi = getMacroAPI(protocol, api);
  const bytesUsed = macroApi.rawKeycodeSequencesToMacroBytes(ast).length;
  return (
    <ProgressBarContainer>
      <ProgressBar>
        <span style={{transform: `scaleX(${bytesUsed / bufferSize})`}} />
      </ProgressBar>
      <ProgressBarTooltip>
        {printBytesUsed(bytesUsed, bufferSize)}
      </ProgressBarTooltip>
    </ProgressBarContainer>
  );
};

export const MacroDetailPane: React.FC<Props> = (props) => {
  const currentMacro = props.macroExpressions[props.selectedMacro] || '';
  const [mode, setMode] = React.useState<'record' | 'script' | 'launch'>(
    'record',
  );
  const ast = useAppSelector((state) => state.macros.ast);
  const isDelaySupported = useAppSelector(getIsDelaySupported);
  const [unsavedMacro, setUnsavedMacro] = useState(currentMacro);
  const [launchCommand, setLaunchCommand] = useState('');
  const [isPickingApp, setIsPickingApp] = useState(false);
  const [isSavingQuickMacro, setIsSavingQuickMacro] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickCategory, setQuickCategory] = useState('All');
  const [quickStatus, setQuickStatus] = useState<{
    message: string;
    error: boolean;
  }>({message: '', error: false});
  const [macroClipboard, setMacroClipboard] = useState(() => {
    try {
      return localStorage.getItem('via-macro-clipboard') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    setUnsavedMacro(currentMacro);
    const launchMatch = currentMacro.match(
      /^\{KC_LGUI,KC_R\}\{\d+\}([\s\S]*)\{KC_ENT\}$/,
    );
    setLaunchCommand(launchMatch ? launchMatch[1].replace(/\\{/g, '{') : '');
  }, [currentMacro]);

  const undoChanges = useCallback(() => {
    setUnsavedMacro(currentMacro);
  }, [currentMacro]);

  const saveMacro = useCallback(
    (macro?: string) => {
      if (macro !== undefined) {
        void props.saveMacros(macro);
        setUnsavedMacro(macro);
      } else if (unsavedMacro !== currentMacro) {
        void props.saveMacros(unsavedMacro);
        setUnsavedMacro(unsavedMacro);
      }
    },
    [currentMacro, props, unsavedMacro],
  );

  const writeMacroClipboard = useCallback(async (macro: string) => {
    setMacroClipboard(macro);
    try {
      localStorage.setItem('via-macro-clipboard', macro);
    } catch {
      // Keep the in-memory clipboard available for this session.
    }
    try {
      await navigator.clipboard.writeText(macro);
    } catch {
      // Browser clipboard permission is optional.
    }
  }, []);

  const applyQuickMacro = useCallback(
    async (expression: string, label: string) => {
      const validation = getMacroValidator(props.protocol)(expression);
      if (!validation.isValid) {
        setQuickStatus({
          message: validation.errorMessage || 'This macro is not valid.',
          error: true,
        });
        return;
      }

      setIsSavingQuickMacro(true);
      setQuickStatus({message: `Saving ${label}...`, error: false});
      try {
        await props.saveMacros(expression);
        setUnsavedMacro(expression);
        setMode('script');
        setQuickStatus({
          message: `${label} saved to M${props.selectedMacro}.`,
          error: false,
        });
      } catch (error) {
        setQuickStatus({
          message:
            error instanceof Error ? error.message : 'Could not save macro.',
          error: true,
        });
      } finally {
        setIsSavingQuickMacro(false);
      }
    },
    [props],
  );

  const pasteMacroClipboard = useCallback(async () => {
    let expression = macroClipboard;
    try {
      const systemClipboard = await navigator.clipboard.readText();
      if (systemClipboard.trim()) {
        expression = systemClipboard.trim();
      }
    } catch {
      // Fall back to VIA's persistent macro clipboard.
    }

    if (!expression) {
      setQuickStatus({message: 'Macro clipboard is empty.', error: true});
      return;
    }
    await applyQuickMacro(expression, 'Pasted macro');
  }, [applyQuickMacro, macroClipboard]);

  const filteredQuickActions = quickActions.filter((action) => {
    const categoryMatches =
      quickCategory === 'All' || action.category === quickCategory;
    const search = quickSearch.trim().toLowerCase();
    const searchMatches =
      !search ||
      action.label.toLowerCase().includes(search) ||
      action.shortcut.toLowerCase().includes(search);
    return categoryMatches && searchMatches;
  });

  const selectWindowsApp = async () => {
    setIsPickingApp(true);
    try {
      const response = await fetch('/api/select-executable');
      if (!response.ok) {
        return;
      }
      const result = (await response.json()) as {path?: string};
      if (result.path) {
        setLaunchCommand(`"${result.path}"`);
      }
    } catch {
      // Keep the current command when the native picker is unavailable.
    } finally {
      setIsPickingApp(false);
    }
  };

  return (
    <>
      <CenterTabContainer>
        <TabBar>
          <MacroTab
            $selected={mode === 'record'}
            onClick={() => setMode('record')}
          >
            <FontAwesomeIcon icon={faClapperboard} />
          </MacroTab>
          <MacroTab
            $selected={mode === 'script'}
            onClick={() => setMode('script')}
          >
            <FontAwesomeIcon icon={faCode} />
          </MacroTab>
          <MacroTab
            $selected={mode === 'launch'}
            onClick={() => setMode('launch')}
            title="Launch app or website"
          >
            <FontAwesomeIcon icon={faRocket} />
          </MacroTab>
        </TabBar>
        <ClipboardBar>
          <UtilityButton
            type="button"
            title="Copy this macro"
            disabled={!currentMacro}
            onClick={() => void writeMacroClipboard(currentMacro)}
          >
            <FontAwesomeIcon icon={faCopy} />
          </UtilityButton>
          <UtilityButton
            type="button"
            title="Paste copied macro here"
            disabled={isSavingQuickMacro}
            onClick={() => void pasteMacroClipboard()}
          >
            <FontAwesomeIcon icon={faPaste} />
          </UtilityButton>
        </ClipboardBar>
      </CenterTabContainer>
      <BufferSizeUsage />
      {mode === 'script' ? (
        <ScriptMode
          macro={currentMacro}
          macroIndex={props.selectedMacro}
          protocol={props.protocol}
          isDelaySupported={isDelaySupported}
          setUnsavedMacro={setUnsavedMacro}
          saveMacros={props.saveMacros}
          key={props.selectedMacro}
        />
      ) : mode === 'record' ? (
        <MacroRecorder
          selectedMacro={ast[props.selectedMacro]}
          setUnsavedMacro={setUnsavedMacro}
          undoMacro={undoChanges}
          saveMacro={saveMacro}
          isDelaySupported={isDelaySupported}
        />
      ) : (
        <LaunchPanel>
          <LaunchGrid>
            <LaunchSection>
              <LaunchLabel htmlFor="macro-launch-command">
                Windows launcher
              </LaunchLabel>
              <LaunchRow>
                <LaunchInput
                  id="macro-launch-command"
                  value={launchCommand}
                  placeholder="Website URL, app name, or .exe"
                  spellCheck={false}
                  onChange={(event) => setLaunchCommand(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && launchCommand.trim()) {
                      const escaped = launchCommand.trim().replace(/{/g, '\\{');
                      void props.saveMacros(
                        `{KC_LGUI,KC_R}{180}${escaped}{KC_ENT}`,
                      );
                    }
                  }}
                />
                <LauncherIconButton
                  disabled={isPickingApp}
                  onClick={selectWindowsApp}
                >
                  <FontAwesomeIcon icon={faFolderOpen} />
                </LauncherIconButton>
                <LauncherSaveButton
                  disabled={!launchCommand.trim()}
                  onClick={() => {
                    const escaped = launchCommand.trim().replace(/{/g, '\\{');
                    void props.saveMacros(
                      `{KC_LGUI,KC_R}{180}${escaped}{KC_ENT}`,
                    );
                  }}
                >
                  Save
                </LauncherSaveButton>
              </LaunchRow>
            </LaunchSection>
            <LaunchSection>
              <LaunchLabel>Quick macros</LaunchLabel>
              <QuickToolbar>
                <QuickSearchWrap>
                  <FontAwesomeIcon icon={faSearch} />
                  <QuickSearch
                    aria-label="Search quick macros"
                    value={quickSearch}
                    placeholder="Search"
                    onChange={(event) => setQuickSearch(event.target.value)}
                  />
                </QuickSearchWrap>
                <QuickCategory
                  aria-label="Quick macro category"
                  value={quickCategory}
                  onChange={(event) => setQuickCategory(event.target.value)}
                >
                  <option>All</option>
                  <option>Editing</option>
                  <option>Browser</option>
                  <option>Windows</option>
                </QuickCategory>
                <UtilityButton
                  type="button"
                  title="Paste macro from clipboard"
                  disabled={isSavingQuickMacro}
                  onClick={() => void pasteMacroClipboard()}
                >
                  <FontAwesomeIcon icon={faPaste} />
                </UtilityButton>
              </QuickToolbar>
              <QuickGrid>
                {filteredQuickActions.map((action) => (
                  <QuickItem key={`${action.category}-${action.label}`}>
                    <QuickButton
                      type="button"
                      title={`Apply ${action.label}`}
                      disabled={isSavingQuickMacro}
                      onClick={() =>
                        void applyQuickMacro(action.expression, action.label)
                      }
                    >
                      {action.label}
                      <QuickShortcut>{action.shortcut}</QuickShortcut>
                    </QuickButton>
                    <QuickCopyButton
                      type="button"
                      title={`Copy ${action.label} macro`}
                      onClick={() =>
                        void writeMacroClipboard(action.expression)
                      }
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </QuickCopyButton>
                  </QuickItem>
                ))}
              </QuickGrid>
              <QuickStatus $error={quickStatus.error}>
                {quickStatus.message}
              </QuickStatus>
            </LaunchSection>
          </LaunchGrid>
        </LaunchPanel>
      )}
    </>
  );
};
