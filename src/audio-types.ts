export type PhaseRole = 'inhale' | 'holdAfterInhale' | 'exhale' | 'holdAfterExhale';
export const phaseRoles: PhaseRole[] = ['inhale', 'holdAfterInhale', 'exhale', 'holdAfterExhale'];
export interface SoundSet {
 id: string;
 name: string;
 recordings: Record<PhaseRole, string | null>;
 frequencies: Record<PhaseRole, number>;
}

export type AudioMode = 'synthesized' | 'recorded';
// Retained synthesis uses the same nominal pitches as the recorded MP3 cues.
export const phaseNotes: Record<PhaseRole, {note: string; frequency: number}> = {
 inhale:{note:'F4',frequency:349},
 holdAfterInhale:{note:'C4',frequency:262},
 exhale:{note:'F3',frequency:174},
 holdAfterExhale:{note:'C4',frequency:262},
};
