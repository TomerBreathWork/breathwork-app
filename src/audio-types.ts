export type PhaseRole = 'inhale' | 'holdAfterInhale' | 'exhale' | 'holdAfterExhale';
export const phaseRoles: PhaseRole[] = ['inhale', 'holdAfterInhale', 'exhale', 'holdAfterExhale'];
export interface SoundSet {
 id: string;
 name: string;
 recordings: Record<PhaseRole, string | null>;
 frequencies: Record<PhaseRole, number>;
}
