import { useEffect, useState } from 'react';
import {
  saveConstants,
  saveCrews,
  saveCrewMembers,
  saveManagers,
  saveSalaries,
} from '../api/client';
import { useAppState } from '../state/AppStateContext';
import { CrewMember, CrewSetting, ManagerSetting, SalarySetting } from '../types';

function useEditableState<T>(value: T | null) {
  const [state, setState] = useState<T | null>(value);
  return {
    value: state,
    setValue: setState,
    reset: (next: T) => setState(next),
  };
}

export default function SettingsPage() {
  const { settings, setSettings } = useAppState();
  const constantsState = useEditableState(settings?.constants ?? null);
  const [managers, setManagers] = useState<ManagerSetting[]>(settings?.managers ?? []);
  const [salaries, setSalaries] = useState<SalarySetting[]>(settings?.salaries ?? []);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(settings?.crewMembers ?? []);
  const [crews, setCrews] = useState<CrewSetting[]>(settings?.crews ?? []);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      constantsState.reset(settings.constants);
      setManagers(settings.managers);
      setSalaries(settings.salaries);
      setCrewMembers(settings.crewMembers);
      setCrews(settings.crews);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!settings || !constantsState.value) {
    return <div className="card">Загрузка настроек…</div>;
  }

  const handleConstantsSave = async () => {
    setStatus(null);
    try {
      const updated = await saveConstants(constantsState.value!);
      setSettings(updated);
      setStatus('Константы обновлены');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось обновить константы');
    }
  };

  const handleManagersSave = async () => {
    try {
      const updated = await saveManagers(managers);
      setSettings(updated);
      setStatus('Настройки менеджеров обновлены');
    } catch (error) {
      console.error(error);
      setStatus('Ошибка сохранения менеджеров');
    }
  };

  const handleSalariesSave = async () => {
    try {
      const updated = await saveSalaries(salaries);
      setSettings(updated);
      setStatus('Оклады обновлены');
    } catch (error) {
      console.error(error);
      setStatus('Ошибка сохранения окладов');
    }
  };

  const handleCrewMembersSave = async () => {
    try {
      const updated = await saveCrewMembers(crewMembers);
      setSettings(updated);
      setStatus('Список сборщиков обновлён');
    } catch (error) {
      console.error(error);
      setStatus('Ошибка сохранения сборщиков');
    }
  };

  const handleCrewsSave = async () => {
    try {
      const updated = await saveCrews(crews);
      setSettings(updated);
      setStatus('Бригады обновлены');
    } catch (error) {
      console.error(error);
      setStatus('Ошибка сохранения бригад');
    }
  };

  const addManager = () => {
    setManagers((prev) => [
      ...prev,
      {
        id: undefined,
        name: '',
        salePct: 0,
        installPct: 0,
        enabled: true,
        aliases: [],
      },
    ]);
  };

  const addSalary = () => {
    setSalaries((prev) => [
      ...prev,
      {
        id: undefined,
        name: '',
        amount: 0,
        enabled: true,
      },
    ]);
  };

  const addCrewMember = () => {
    setCrewMembers((prev) => [
      ...prev,
      {
        id: undefined,
        name: '',
      },
    ]);
  };

  const addCrew = () => {
    const availableMembers = crewMembers.filter((member) => member.id != null);
    if (availableMembers.length < 2) {
      setStatus('Добавьте минимум двух сборщиков для создания бригады');
      return;
    }
    setCrews((prev) => [
      ...prev,
      {
        id: undefined,
        name: `Бригада ${prev.length + 1}`,
        members: availableMembers.slice(0, 2).map((member) => ({
          memberId: member.id!,
          name: member.name,
          share: 0.5,
        })),
      },
    ]);
  };

  const updateCrewMemberShare = (crewIndex: number, memberIndex: number, share: number) => {
    setCrews((prev) =>
      prev.map((crew, idx) =>
        idx === crewIndex
          ? {
              ...crew,
              members: crew.members.map((member, index) =>
                index === memberIndex ? { ...member, share } : member
              ),
            }
          : crew
      )
    );
  };

  const updateCrewMemberSelection = (crewIndex: number, memberIndex: number, memberId: number) => {
    const member = crewMembers.find((item) => item.id === memberId);
    if (!member) return;
    setCrews((prev) =>
      prev.map((crew, idx) =>
        idx === crewIndex
          ? {
              ...crew,
              members: crew.members.map((item, index) =>
                index === memberIndex ? { ...item, memberId, name: member.name } : item
              ),
            }
          : crew
      )
    );
  };

  return (
    <div className="card">
      <h1 className="section-title">Настройки</h1>
      {status && <p>{status}</p>}
      <section>
        <h2>Константы</h2>
        <div className="flex">
          <label>
            Нагрузчики (₽)
            <input
              type="number"
              value={constantsState.value.loadersFixed}
              onChange={(event) =>
                constantsState.setValue({
                  ...constantsState.value!,
                  loadersFixed: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Фонд сборщиков (%)
            <input
              type="number"
              step="0.01"
              value={constantsState.value.installersPercent}
              onChange={(event) =>
                constantsState.setValue({
                  ...constantsState.value!,
                  installersPercent: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <button className="button" style={{ marginTop: 12 }} onClick={handleConstantsSave}>
          Сохранить константы
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Менеджеры и алиасы</h2>
        <button className="button secondary" onClick={addManager}>
          Добавить менеджера
        </button>
        {managers.map((manager, index) => (
          <div key={manager.id ?? index} className="card" style={{ marginTop: 16 }}>
            <div className="flex" style={{ flexWrap: 'wrap' }}>
              <label>
                ФИО
                <input
                  type="text"
                  value={manager.name}
                  onChange={(event) =>
                    setManagers((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                />
              </label>
              <label>
                % продажи
                <input
                  type="number"
                  step="0.01"
                  value={manager.salePct}
                  onChange={(event) =>
                    setManagers((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, salePct: Number(event.target.value) }
                          : item
                      )
                    )
                  }
                />
              </label>
              <label>
                % монтаж
                <input
                  type="number"
                  step="0.01"
                  value={manager.installPct}
                  onChange={(event) =>
                    setManagers((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, installPct: Number(event.target.value) }
                          : item
                      )
                    )
                  }
                />
              </label>
              <label>
                Активен
                <input
                  type="checkbox"
                  checked={manager.enabled}
                  onChange={(event) =>
                    setManagers((prev) =>
                      prev.map((item, idx) =>
                        idx === index ? { ...item, enabled: event.target.checked } : item
                      )
                    )
                  }
                />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              Алиасы (через запятую)
              <input
                type="text"
                value={manager.aliases.join(', ')}
                onChange={(event) =>
                  setManagers((prev) =>
                    prev.map((item, idx) =>
                      idx === index
                        ? { ...item, aliases: event.target.value.split(',').map((v) => v.trim()).filter(Boolean) }
                        : item
                    )
                  )
                }
              />
            </label>
          </div>
        ))}
        <button className="button" style={{ marginTop: 12 }} onClick={handleManagersSave}>
          Сохранить менеджеров
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Фиксированные оклады</h2>
        <button className="button secondary" onClick={addSalary}>
          Добавить оклад
        </button>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Сумма, ₽</th>
              <th>Включён</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((salary, index) => (
              <tr key={salary.id ?? index}>
                <td>
                  <input
                    type="text"
                    value={salary.name}
                    onChange={(event) =>
                      setSalaries((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={salary.amount}
                    onChange={(event) =>
                      setSalaries((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, amount: Number(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={salary.enabled}
                    onChange={(event) =>
                      setSalaries((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, enabled: event.target.checked }
                            : item
                        )
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="button" style={{ marginTop: 12 }} onClick={handleSalariesSave}>
          Сохранить оклады
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Сборщики</h2>
        <button className="button secondary" onClick={addCrewMember}>
          Добавить сборщика
        </button>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>ФИО</th>
            </tr>
          </thead>
          <tbody>
            {crewMembers.map((member, index) => (
              <tr key={member.id ?? index}>
                <td>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(event) =>
                      setCrewMembers((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="button" style={{ marginTop: 12 }} onClick={handleCrewMembersSave}>
          Сохранить сборщиков
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Бригады (2 человека)</h2>
        <button className="button secondary" onClick={addCrew}>
          Добавить бригаду
        </button>
        {crews.map((crew, index) => (
          <div key={crew.id ?? index} className="card" style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 12 }}>
              Название
              <input
                type="text"
                value={crew.name}
                onChange={(event) =>
                  setCrews((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, name: event.target.value } : item
                    )
                  )
                }
              />
            </label>
            <div className="flex" style={{ flexWrap: 'wrap' }}>
              {crew.members.map((member, memberIndex) => (
                <div key={memberIndex} style={{ minWidth: 240 }}>
                  <label>
                    Участник {memberIndex + 1}
                    <select
                      value={member.memberId}
                      onChange={(event) =>
                        updateCrewMemberSelection(index, memberIndex, Number(event.target.value))
                      }
                    >
                      {crewMembers
                        .filter((option) => option.id != null)
                        .map((option) => (
                          <option key={option.id} value={option.id!}>
                            {option.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label style={{ display: 'block', marginTop: 8 }}>
                    Доля
                    <input
                      type="number"
                      step="0.01"
                      value={member.share}
                      onChange={(event) =>
                        updateCrewMemberShare(index, memberIndex, Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="button" style={{ marginTop: 12 }} onClick={handleCrewsSave}>
          Сохранить бригады
        </button>
      </section>
    </div>
  );
}
