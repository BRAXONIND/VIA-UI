import {FC, useCallback, useEffect, useMemo, useState} from 'react';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPen, faPlus, faTrash} from '@fortawesome/free-solid-svg-icons';
import {OverflowCell, SubmenuOverflowCell} from '../grid';
import {CenterPane} from '../pane';
import {title, component} from '../../icons/adjust';
import {MacroDetailPane} from './submenus/macros/macro-detail';
import {useAppDispatch, useAppSelector} from '../../../store/hooks';
import {getSelectedConnectedDevice} from '../../../store/devicesSlice';
import {
  getExpressions,
  getMacroCapacity,
  getMacroCount,
  getMacroNames,
  saveMacroMetadata,
  saveMacros,
} from '../../../store/macrosSlice';

const MacroPane = styled(CenterPane)`
  min-height: 100%;
  background: var(--color_dark_grey);
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 8px 18px 24px;
`;

const MacroSidebar = styled(SubmenuOverflowCell)`
  min-width: 220px;
  background: var(--bg_menu);
`;

const SidebarHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 12px 10px;
  background: var(--bg_menu);
  border-bottom: 1px solid var(--border_color_cell);
`;

const SidebarTitle = styled.div`
  color: var(--color_label-highlighted);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid var(--border_color_cell);
  border-radius: 5px;
  color: var(--color_label);
  background: var(--bg_control);
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--color_accent);
    border-color: var(--color_accent);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const MacroList = styled.div`
  padding: 8px;
`;

const MacroRow = styled.button<{$selected: boolean}>`
  width: 100%;
  min-height: 46px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border: 1px solid
    ${(props) => (props.$selected ? 'var(--color_accent)' : 'transparent')};
  border-radius: 5px;
  color: var(--color_label);
  background: ${(props) =>
    props.$selected ? 'var(--bg_icon)' : 'transparent'};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--bg_control);
  }
`;

const MacroId = styled.span`
  color: var(--color_accent);
  font-size: 12px;
  font-weight: 700;
`;

const MacroName = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color_label-highlighted);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RenameInput = styled.input`
  min-width: 0;
  width: 100%;
  height: 30px;
  box-sizing: border-box;
  border: 1px solid var(--color_accent);
  border-radius: 4px;
  padding: 0 7px;
  color: var(--color_label-highlighted);
  background: var(--bg_control);
  font: inherit;

  &:focus {
    outline: none;
  }
`;

const RowAction = styled.span`
  color: var(--color_label);
  text-align: center;
  opacity: 0.65;
`;

export const Pane: FC = () => {
  const dispatch = useAppDispatch();
  const selectedDevice = useAppSelector(getSelectedConnectedDevice);
  const macroExpressions = useAppSelector(getExpressions);
  const macroCount = useAppSelector(getMacroCount);
  const macroCapacity = useAppSelector(getMacroCapacity);
  const macroNames = useAppSelector(getMacroNames);

  const [selectedMacro, setSelectedMacro] = useState(0);
  const [renamingMacro, setRenamingMacro] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (selectedMacro >= macroCount) {
      setSelectedMacro(Math.max(0, macroCount - 1));
    }
  }, [macroCount, selectedMacro]);

  const normalizedNames = useMemo(
    () =>
      Array.from(
        {length: macroCapacity},
        (_, index) => macroNames[index] || `Macro ${index + 1}`,
      ),
    [macroCapacity, macroNames],
  );

  const saveMacro = useCallback(
    async (macro: string) => {
      if (!selectedDevice) {
        return;
      }
      const newMacros = macroExpressions.map((oldMacro, index) =>
        index === selectedMacro ? macro : oldMacro,
      );
      await dispatch(saveMacros(selectedDevice, newMacros));
    },
    [dispatch, macroExpressions, selectedDevice, selectedMacro],
  );

  const saveNames = (count: number, names: string[]) => {
    if (selectedDevice) {
      dispatch(saveMacroMetadata(selectedDevice, count, names));
    }
  };

  const addMacro = () => {
    if (macroCount >= macroCapacity) {
      return;
    }
    const nextNames = [...normalizedNames];
    nextNames[macroCount] = `Macro ${macroCount + 1}`;
    saveNames(macroCount + 1, nextNames);
    setSelectedMacro(macroCount);
  };

  const deleteMacro = (index: number) => {
    if (!selectedDevice || macroCount <= 1) {
      return;
    }
    const nextExpressions = [...macroExpressions];
    nextExpressions.splice(index, 1);
    nextExpressions.push('');
    const nextNames = [...normalizedNames];
    nextNames.splice(index, 1);
    nextNames.push(`Macro ${macroCapacity}`);
    dispatch(saveMacros(selectedDevice, nextExpressions));
    saveNames(macroCount - 1, nextNames);
    setSelectedMacro(Math.min(index, macroCount - 2));
    setRenamingMacro(null);
  };

  const commitRename = (index: number) => {
    const nextNames = [...normalizedNames];
    nextNames[index] = renameDraft.trim() || `Macro ${index + 1}`;
    saveNames(macroCount, nextNames);
    setRenamingMacro(null);
  };

  if (!selectedDevice) {
    return null;
  }

  return (
    <>
      <MacroSidebar>
        <SidebarHeader>
          <SidebarTitle>
            Macros {macroCount}/{macroCapacity}
          </SidebarTitle>
          <IconButton
            aria-label="Add macro"
            title="Add macro"
            disabled={macroCount >= macroCapacity}
            onClick={addMacro}
          >
            <FontAwesomeIcon icon={faPlus} />
          </IconButton>
        </SidebarHeader>
        <MacroList>
          {Array.from({length: macroCount}, (_, index) => (
            <MacroRow
              type="button"
              $selected={selectedMacro === index}
              onClick={() => setSelectedMacro(index)}
              onDoubleClick={() => {
                setRenamingMacro(index);
                setRenameDraft(normalizedNames[index]);
              }}
              key={index}
            >
              <MacroId>M{index}</MacroId>
              {renamingMacro === index ? (
                <RenameInput
                  autoFocus
                  maxLength={12}
                  value={renameDraft}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={() => commitRename(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                      setRenamingMacro(null);
                    }
                  }}
                />
              ) : (
                <MacroName>{normalizedNames[index]}</MacroName>
              )}
              <RowAction
                title={
                  selectedMacro === index ? 'Delete macro' : 'Rename macro'
                }
                onClick={(event) => {
                  event.stopPropagation();
                  if (selectedMacro === index) {
                    deleteMacro(index);
                  } else {
                    setSelectedMacro(index);
                    setRenamingMacro(index);
                    setRenameDraft(normalizedNames[index]);
                  }
                }}
              >
                <FontAwesomeIcon
                  icon={selectedMacro === index ? faTrash : faPen}
                />
              </RowAction>
            </MacroRow>
          ))}
        </MacroList>
      </MacroSidebar>
      <OverflowCell>
        <MacroPane>
          <Container>
            <MacroDetailPane
              macroExpressions={macroExpressions}
              selectedMacro={selectedMacro}
              saveMacros={saveMacro}
              protocol={selectedDevice.protocol}
            />
          </Container>
        </MacroPane>
      </OverflowCell>
    </>
  );
};

export const Icon = component;
export const Title = title;
