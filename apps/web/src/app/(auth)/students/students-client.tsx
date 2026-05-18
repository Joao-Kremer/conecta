'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createStudentInput,
  guardiansListApi,
  studentGuardiansApi,
  studentsApi,
  updateStudentInput,
  type CreateStudentInput,
  type GuardianRelationship,
  type Student,
  type StudentGuardian,
} from './students.api';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAbility } from '@/hooks/use-ability';
import { ApiError } from '@/lib/api/errors';
import { guardianKeys, studentKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const UNIFORM_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;
const RELATIONSHIPS: GuardianRelationship[] = [
  'FATHER',
  'MOTHER',
  'GRANDPARENT',
  'OTHER',
];
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

// Shared classes so the native <select> matches the Input component.
const selectClassName =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

interface StudentsClientProps {
  initialData: Student[];
}

interface StudentFormValues {
  fullName: string;
  birthDate: string;
  document: string;
  photoUrl: string;
  uniformSize: '' | (typeof UNIFORM_SIZES)[number];
  status: (typeof STATUSES)[number];
  medicalNotes: string;
  allergies: string;
  medications: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
}

function toFormValues(student?: Student): StudentFormValues {
  return {
    fullName: student?.fullName ?? '',
    birthDate: student?.birthDate ?? '',
    document: student?.document ?? '',
    photoUrl: student?.photoUrl ?? '',
    uniformSize: (student?.uniformSize ?? '') as StudentFormValues['uniformSize'],
    status: (student?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'),
    medicalNotes: student?.medicalNotes ?? '',
    allergies: student?.allergies ?? '',
    medications: student?.medications ?? '',
    emergencyName: student?.emergencyContact?.name ?? '',
    emergencyPhone: student?.emergencyContact?.phone ?? '',
    emergencyRelationship: student?.emergencyContact?.relationship ?? '',
  };
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim() === '' ? undefined : value;
}

// `includeMedical` mirrors the coarse CASL gate: CASL only gives subject-level
// (not field-level) authorization, so medical fields are dropped entirely when
// the user can't update Student.
function toPayload(
  values: StudentFormValues,
  includeMedical: boolean,
): CreateStudentInput {
  const emergencyContact =
    includeMedical &&
    (values.emergencyName.trim() !== '' ||
      values.emergencyPhone.trim() !== '' ||
      values.emergencyRelationship.trim() !== '')
      ? {
          name: values.emergencyName,
          phone: values.emergencyPhone,
          relationship: values.emergencyRelationship,
        }
      : undefined;

  return {
    fullName: values.fullName,
    birthDate: values.birthDate,
    document: emptyToUndefined(values.document),
    photoUrl: emptyToUndefined(values.photoUrl),
    uniformSize: values.uniformSize === '' ? undefined : values.uniformSize,
    status: values.status,
    medicalNotes: includeMedical
      ? emptyToUndefined(values.medicalNotes)
      : undefined,
    allergies: includeMedical ? emptyToUndefined(values.allergies) : undefined,
    medications: includeMedical
      ? emptyToUndefined(values.medications)
      : undefined,
    emergencyContact,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function guardianName(
  guardians: { id: string; fullName?: string; name?: string }[] | undefined,
  guardianId: string,
): string {
  const g = guardians?.find((x) => x.id === guardianId);
  return g?.fullName ?? g?.name ?? guardianId;
}

export function StudentsClient({ initialData }: StudentsClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const canCreate = ability.can('create', 'Student');
  const canUpdate = ability.can('update', 'Student');
  const canDelete = ability.can('delete', 'Student');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | (typeof STATUSES)[number]>('');

  // Lightweight 300ms debounce of the free-text search.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data } = useQuery({
    queryKey: studentKeys.list({ search, status }),
    queryFn: () =>
      studentsApi.list({
        search: search || undefined,
        status: status || undefined,
      }),
    initialData,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [guardiansFor, setGuardiansFor] = useState<Student | null>(null);

  const isEditing = editing !== null;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(isEditing ? updateStudentInput : createStudentInput),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(student: Student) {
    setEditing(student);
    form.reset(toFormValues(student));
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      form.reset(toFormValues());
    }
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: studentKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: StudentFormValues) =>
      studentsApi.create(toPayload(values, canUpdate)),
    onSuccess: async () => {
      await invalidate();
      toast.success(t('admin.actions.saved'));
      handleDialogChange(false);
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, t('admin.actions.error')));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: StudentFormValues) => {
      if (!editing) throw new Error('No student selected');
      return studentsApi.update(editing.id, toPayload(values, canUpdate));
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t('admin.actions.saved'));
      handleDialogChange(false);
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, t('admin.actions.error')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t('admin.actions.deleted'));
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, t('admin.actions.error')));
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: StudentFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<Student, unknown>[] = [
    {
      accessorKey: 'fullName',
      header: () => t('admin.students.fullName'),
      cell: ({ row }) => row.original.fullName,
    },
    {
      accessorKey: 'birthDate',
      header: () => t('admin.students.birthDate'),
      cell: ({ row }) => row.original.birthDate,
    },
    {
      accessorKey: 'status',
      header: () => t('admin.students.status'),
      cell: ({ row }) =>
        row.original.status === 'INACTIVE'
          ? t('admin.students.inactive')
          : t('admin.students.active'),
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGuardiansFor(row.original)}
          >
            {t('admin.students.manageGuardians')}
          </Button>
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(row.original)}
            >
              {t('admin.actions.edit')}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => setDeleteTarget(row.original)}
            >
              {t('admin.actions.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const emptyState = (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">
        {t('admin.students.empty')}
      </p>
      {canCreate && (
        <Button onClick={openCreate}>{t('admin.students.new')}</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder={t('admin.students.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="sm:max-w-xs"
          />
          <select
            aria-label={t('admin.students.filterStatus')}
            className={cn(selectClassName, 'sm:max-w-[12rem]')}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as '' | (typeof STATUSES)[number])
            }
          >
            <option value="">{t('admin.students.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(s === 'ACTIVE' ? 'admin.students.active' : 'admin.students.inactive')}
              </option>
            ))}
          </select>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>{t('admin.students.new')}</Button>
        )}
      </div>

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.students.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.fullName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.birthDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.document')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.photoUrl')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="uniformSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.uniformSize')}</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        <option value="">—</option>
                        {UNIFORM_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.students.status')}</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        <option value="ACTIVE">
                          {t('admin.students.active')}
                        </option>
                        <option value="INACTIVE">
                          {t('admin.students.inactive')}
                        </option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Medical section is a coarse CASL gate: CASL only authorizes
                  at the subject level (no field-level rules), so the whole
                  block is hidden and dropped from the payload when the user
                  can't update Student. */}
              {canUpdate && (
                <div className="space-y-4 rounded-md border border-border p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t('admin.students.medicalSection')}
                  </p>
                  <FormField
                    control={form.control}
                    name="medicalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.students.medicalNotes')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.students.allergies')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.students.medications')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm font-medium text-foreground">
                    {t('admin.students.emergencyContact')}
                  </p>
                  <FormField
                    control={form.control}
                    name="emergencyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.students.emergencyName')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.students.emergencyPhone')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('admin.students.emergencyRelationship')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  disabled={isSaving}
                >
                  {t('admin.actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? t('admin.actions.saving')
                    : t('admin.actions.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.actions.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.actions.confirmDelete')}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              {t('admin.actions.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending
                ? t('admin.actions.saving')
                : t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GuardiansDialog
        student={guardiansFor}
        onClose={() => setGuardiansFor(null)}
        canUpdate={canUpdate}
      />
    </div>
  );
}

interface GuardiansDialogProps {
  student: Student | null;
  onClose: () => void;
  canUpdate: boolean;
}

interface LinkFormValues {
  guardianId: string;
  relationship: GuardianRelationship;
  isPrimaryPayer: boolean;
  receivesCommunications: boolean;
  isEmergencyContact: boolean;
}

function GuardiansDialog({
  student,
  onClose,
  canUpdate,
}: GuardiansDialogProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const studentId = student?.id ?? '';

  const linksKey = [...studentKeys.detail(studentId), 'guardians'] as const;

  const { data: links } = useQuery({
    queryKey: linksKey,
    queryFn: () => studentGuardiansApi.listByStudent(studentId),
    enabled: student !== null,
  });

  const { data: guardians } = useQuery({
    queryKey: guardianKeys.list(),
    queryFn: () => guardiansListApi.list(),
    enabled: student !== null,
  });

  const [guardianId, setGuardianId] = useState('');
  const [relationship, setRelationship] =
    useState<GuardianRelationship>('OTHER');
  const [isPrimaryPayer, setIsPrimaryPayer] = useState(false);
  const [receivesCommunications, setReceivesCommunications] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<StudentGuardian | null>(
    null,
  );

  function resetSubForm() {
    setGuardianId('');
    setRelationship('OTHER');
    setIsPrimaryPayer(false);
    setReceivesCommunications(false);
    setIsEmergencyContact(false);
  }

  const invalidateLinks = () =>
    queryClient.invalidateQueries({ queryKey: linksKey });

  const linkMutation = useMutation({
    mutationFn: (values: LinkFormValues) =>
      studentGuardiansApi.link({ studentId, ...values }),
    onSuccess: async () => {
      await invalidateLinks();
      await queryClient.invalidateQueries({ queryKey: studentKeys.all });
      toast.success(t('admin.actions.saved'));
      resetSubForm();
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, t('admin.actions.error')));
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => studentGuardiansApi.unlink(id),
    onSuccess: async () => {
      await invalidateLinks();
      await queryClient.invalidateQueries({ queryKey: studentKeys.all });
      toast.success(t('admin.actions.deleted'));
      setUnlinkTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(errorMessage(error, t('admin.actions.error')));
    },
  });

  function handleOpenChange(open: boolean) {
    if (!open) {
      resetSubForm();
      onClose();
    }
  }

  function submitLink() {
    if (guardianId === '') return;
    linkMutation.mutate({
      guardianId,
      relationship,
      isPrimaryPayer,
      receivesCommunications,
      isEmergencyContact,
    });
  }

  return (
    <Dialog open={student !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.students.manageGuardians')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!links || links.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.students.noGuardians')}
            </p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">
                      {guardianName(guardians, link.guardianId)}
                    </p>
                    <p className="text-muted-foreground">
                      {t(`admin.students.rel.${link.relationship}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        link.isPrimaryPayer &&
                          t('admin.students.isPrimaryPayer'),
                        link.receivesCommunications &&
                          t('admin.students.receivesCommunications'),
                        link.isEmergencyContact &&
                          t('admin.students.isEmergencyContact'),
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      onClick={() => setUnlinkTarget(link)}
                    >
                      {t('admin.students.unlink')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canUpdate && (
          <div className="space-y-3 rounded-md border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              {t('admin.students.linkGuardian')}
            </p>
            <select
              aria-label={t('admin.students.linkGuardian')}
              className={selectClassName}
              value={guardianId}
              onChange={(e) => setGuardianId(e.target.value)}
            >
              <option value="">—</option>
              {guardians?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.fullName ?? g.name ?? g.id}
                </option>
              ))}
            </select>
            <select
              aria-label={t('admin.students.relationship')}
              className={selectClassName}
              value={relationship}
              onChange={(e) =>
                setRelationship(e.target.value as GuardianRelationship)
              }
            >
              {RELATIONSHIPS.map((rel) => (
                <option key={rel} value={rel}>
                  {t(`admin.students.rel.${rel}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrimaryPayer}
                onChange={(e) => setIsPrimaryPayer(e.target.checked)}
              />
              {t('admin.students.isPrimaryPayer')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={receivesCommunications}
                onChange={(e) => setReceivesCommunications(e.target.checked)}
              />
              {t('admin.students.receivesCommunications')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isEmergencyContact}
                onChange={(e) => setIsEmergencyContact(e.target.checked)}
              />
              {t('admin.students.isEmergencyContact')}
            </label>
            <Button
              type="button"
              onClick={submitLink}
              disabled={linkMutation.isPending || guardianId === ''}
            >
              {linkMutation.isPending
                ? t('admin.actions.saving')
                : t('admin.students.linkGuardian')}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('admin.actions.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.students.unlink')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.actions.confirmDelete')}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnlinkTarget(null)}
              disabled={unlinkMutation.isPending}
            >
              {t('admin.actions.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={unlinkMutation.isPending}
              onClick={() => {
                if (unlinkTarget) unlinkMutation.mutate(unlinkTarget.id);
              }}
            >
              {unlinkMutation.isPending
                ? t('admin.actions.saving')
                : t('admin.students.unlink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
