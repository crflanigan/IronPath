import { beforeEach, describe, expect, it } from 'vitest';
import { localWorkoutStorage } from './storage';
import {
  defaultWorkoutCycle,
  generateWorkoutSchedule,
  getTodaysWorkoutType,
  getWorkoutCycle,
} from './workout-data';

/**
 * The auto-schedule rotation is persisted as a list of workout *names*. These
 * tests pin the behaviour that has to hold when a custom template's name
 * changes or the template disappears entirely.
 */

async function addTemplate(name: string, includeInAutoSchedule = true) {
  return localWorkoutStorage.addCustomTemplate({
    name,
    exercises: [],
    abs: [],
    includeInAutoSchedule,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('renaming a custom template', () => {
  it('keeps it in the auto-schedule rotation', async () => {
    const template = await addTemplate('My Custom');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Chest Day', 'My Custom']);

    await localWorkoutStorage.updateCustomTemplate(template.id, {
      name: 'My Custom Renamed',
      exercises: [],
      abs: [],
      includeInAutoSchedule: true,
    });

    expect(getWorkoutCycle()).toContain('My Custom Renamed');
  });

  it('does not leave the old name behind in the rotation', async () => {
    const template = await addTemplate('My Custom');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Chest Day', 'My Custom']);

    await localWorkoutStorage.updateCustomTemplate(template.id, {
      name: 'My Custom Renamed',
      exercises: [],
      abs: [],
      includeInAutoSchedule: true,
    });

    expect(localWorkoutStorage.getAutoScheduleWorkouts()).not.toContain('My Custom');
  });

  it('leaves an unselected template out of the rotation after a rename', async () => {
    const template = await addTemplate('Not Scheduled', false);
    localWorkoutStorage.saveAutoScheduleWorkouts(['Chest Day']);

    await localWorkoutStorage.updateCustomTemplate(template.id, {
      name: 'Still Not Scheduled',
      exercises: [],
      abs: [],
      includeInAutoSchedule: false,
    });

    expect(getWorkoutCycle()).not.toContain('Still Not Scheduled');
  });
});

describe('deleting a custom template', () => {
  it('removes it from the stored rotation', async () => {
    const template = await addTemplate('Doomed');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Chest Day', 'Doomed']);

    await localWorkoutStorage.deleteCustomTemplate(template.id);

    expect(localWorkoutStorage.getAutoScheduleWorkouts()).not.toContain('Doomed');
  });

  it('leaves a usable rotation when it was the only one selected', async () => {
    const template = await addTemplate('Only One');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Only One']);

    await localWorkoutStorage.deleteCustomTemplate(template.id);

    expect(getWorkoutCycle().length).toBeGreaterThan(0);
  });
});

describe('names shared with a built-in preset', () => {
  it('keeps the preset selected when a same-named custom template is deleted', async () => {
    // The builder does not currently stop a user naming a template after a
    // preset, so the rotation entry can be claimed by both.
    const template = await addTemplate('Legs');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Legs']);

    await localWorkoutStorage.deleteCustomTemplate(template.id);

    expect(localWorkoutStorage.getAutoScheduleWorkouts()).toContain('Legs');
    expect(getWorkoutCycle()).toContain('Legs');
  });

  it('keeps the preset selected when a same-named custom template is renamed', async () => {
    const template = await addTemplate('Legs');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Legs']);

    await localWorkoutStorage.updateCustomTemplate(template.id, {
      name: 'Legs But Mine',
      exercises: [],
      abs: [],
      includeInAutoSchedule: true,
    });

    expect(localWorkoutStorage.getAutoScheduleWorkouts()).toContain('Legs');
  });
});

describe('the schedule is always well-formed', () => {
  it('never yields an undefined workout type', async () => {
    const template = await addTemplate('Only One');
    localWorkoutStorage.saveAutoScheduleWorkouts(['Only One']);
    await localWorkoutStorage.deleteCustomTemplate(template.id);

    const schedule = generateWorkoutSchedule(2026, 7);
    expect(schedule).toHaveLength(31);
    expect(schedule.every(entry => typeof entry.type === 'string' && entry.type.length > 0)).toBe(
      true,
    );
  });

  it("never yields an undefined type for today", async () => {
    localWorkoutStorage.saveAutoScheduleWorkouts(['A Template That No Longer Exists']);

    expect(typeof getTodaysWorkoutType()).toBe('string');
    expect(getTodaysWorkoutType().length).toBeGreaterThan(0);
  });

  it('falls back to the built-in rotation when nothing selected still exists', async () => {
    localWorkoutStorage.saveAutoScheduleWorkouts(['Gone', 'Also Gone']);

    expect(getWorkoutCycle()).toEqual(defaultWorkoutCycle);
  });
});

describe('an untouched rotation still behaves', () => {
  it('uses the built-in cycle when nothing has been customised', () => {
    expect(getWorkoutCycle()).toEqual(defaultWorkoutCycle);
  });

  it('honours an explicit preset selection', () => {
    localWorkoutStorage.saveAutoScheduleWorkouts(['Chest Day', 'Legs']);

    const cycle = getWorkoutCycle();
    expect(cycle).toContain('Chest Day');
    expect(cycle).toContain('Legs');
    expect(cycle).not.toContain('Back & Biceps');
  });

  it('includes custom templates flagged for auto-schedule on a fresh install', async () => {
    await addTemplate('Fresh Custom', true);

    expect(getWorkoutCycle()).toContain('Fresh Custom');
  });
});
