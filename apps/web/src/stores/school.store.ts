import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface School {
  id: string;
  name: string;
}

interface SchoolState {
  selectedSchool: School | null;
  setSelectedSchool: (school: School | null) => void;
}

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set) => ({
      selectedSchool: null,
      setSelectedSchool: (school) => set({ selectedSchool: school }),
    }),
    { name: 'conecta-school' },
  ),
);
