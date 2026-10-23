export type PhaseRole = 'inhale' | 'holdAfterInhale' | 'exhale' | 'holdAfterExhale';
export const phaseRoles: PhaseRole[] = ['inhale', 'holdAfterInhale', 'exhale', 'holdAfterExhale'];
export interface SoundSet {
 id: string;
 name: string;
 recordings: Record<PhaseRole, string | null>;
 frequencies: Record<PhaseRole, number>;
}

export type AudioMode = 'synthesized' | 'recorded';
export const phaseNotes: Record<PhaseRole, {note: string; frequency: number}> = {
 inhale:{note:'C4',frequency:261.63},
 holdAfterInhale:{note:'G3',frequency:196.00},
 exhale:{note:'C4',frequency:261.63},
 holdAfterExhale:{note:'E4',frequency:329.63},
};
