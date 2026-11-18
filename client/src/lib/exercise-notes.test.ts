import { describe, it, expect, beforeEach } from 'vitest'
import { EXERCISE_NOTE_MAX, localWorkoutStorage } from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('exercise notes', () => {
  it('keeps a note per exercise', () => {
    localWorkoutStorage.saveExerciseNote('Seated Row', 'seat 4, pin 7')
    localWorkoutStorage.saveExerciseNote('Pec Fly', 'handles at 2')
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({
      'Seated Row': 'seat 4, pin 7',
      'Pec Fly': 'handles at 2',
    })
  })

  it('removes the entry when a note is cleared', () => {
    localWorkoutStorage.saveExerciseNote('Seated Row', 'seat 4')
    localWorkoutStorage.saveExerciseNote('Seated Row', '   ')
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({})
  })

  it('caps the length', () => {
    localWorkoutStorage.saveExerciseNote('Seated Row', 'x'.repeat(500))
    expect(localWorkoutStorage.getExerciseNotes()['Seated Row']).toHaveLength(EXERCISE_NOTE_MAX)
  })

  it('survives garbage in storage', () => {
    localStorage.setItem('ironpath_exercise_notes', '{not json')
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({})
    localStorage.setItem('ironpath_exercise_notes', JSON.stringify(['a', 3]))
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({})
  })

  it('travels in a backup and comes back on restore', async () => {
    localWorkoutStorage.saveExerciseNote('Seated Row', 'seat 4, pin 7')
    const backup = await localWorkoutStorage.exportData()
    expect(backup.exerciseNotes).toEqual({ 'Seated Row': 'seat 4, pin 7' })

    await localWorkoutStorage.clearAllData()
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({})

    await localWorkoutStorage.importData(JSON.parse(JSON.stringify(backup)))
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({ 'Seated Row': 'seat 4, pin 7' })
  })

  it('restores a backup made before notes existed', async () => {
    const backup = JSON.parse(JSON.stringify(await localWorkoutStorage.exportData()))
    delete backup.exerciseNotes
    localWorkoutStorage.saveExerciseNote('Seated Row', 'seat 4')
    await localWorkoutStorage.importData(backup)
    // Omitted fields are left as they are, like every other optional field.
    expect(localWorkoutStorage.getExerciseNotes()).toEqual({ 'Seated Row': 'seat 4' })
  })
})
