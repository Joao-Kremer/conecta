'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  classesApi,
  createClassInput,
  schoolModalitiesApi,
  schoolsApi,
  updateClassInput,
  type Class,
  type CreateClassInput,
} from './classes.api';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAbility } from '@/hooks/use-ability';
import { ApiError } from '@/lib/api/errors';
import { classKeys, schoolKeys, schoolModalityKeys } from '@/lib/query-keys';


// PT short weekday labels, indexed by the numeric `weekday` (0 = Sunday).
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

interface ClassesClientProps {
  initialData: Class[];
}

interface ScheduleRow {
  weekday: number;
  start: string;
  end: string;
}

interface ClassFormValues {
  schoolId: string;
  schoolModalityId: string;
  name: string;
  ageGroup: string;
  location: string;
  capacity: string;
  schedule: ScheduleRow[];
}

function toFormValues(klass?: Class): ClassFormValues {
  return {
    schoolId: klass?.schoolId ?? '',
    schoolModalityId: klass?.schoolModalityId ?? '',
    name: klass?.name ?? '',
    ageGroup: klass?.ageGroup ?? '',
    location: klass?.location ?? '',
    capacity: klass?.capacity != null ? String(klass.capacity) : '',
    schedule:
      klass?.schedule && klass.schedule.length > 0
        ? klass.schedule.map((s) => ({ weekday: s.weekday, start: s.start, end: s.end }))
        : [{ weekday: 1, start: '', end: '' }],
  };
}

// Builds the create payload. Empty optional strings become undefined; capacity
// is parsed to a number (or undefined when blank).
function toCreatePayload(values: ClassFormValues): CreateClassInput {
  const capacity = values.capacity.trim();
  return {
    schoolId: values.schoolId,
    schoolModalityId: values.schoolModalityId,
    name: values.name,
    ageGroup: values.ageGroup.trim() === '' ? undefined : values.ageGroup,
    location: values.location.trim() === '' ? undefined : values.location,
    capacity: capacity === '' ? undefined : Number(capacity),
    schedule: values.schedule.map((s) => ({
      weekday: Number(s.weekday),
      start: s.start,
      end: s.end,
    })),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ClassesClient({ initialData }: ClassesClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);

  const canCreate = ability.can('create', 'Class');
  const canUpdate = ability.can('update', 'Class');
  const canDelete = ability.can('delete', 'Class');

  const { data } = useQuery({
    queryKey: classKeys.list(),
    queryFn: () => classesApi.list(),
    initialData,
  });

  const { data: schools = [] } = useQuery({
    queryKey: schoolKeys.list(),
    queryFn: () => schoolsApi.list(),
  });

  const { data: schoolModalities = [] } = useQuery({
    queryKey: schoolModalityKeys.list(),
    queryFn: () => schoolModalitiesApi.list(),
  });

  const schoolNameById = useMemo(
    () => new Map(schools.map((s) => [s.id, s.name])),
    [schools],
  );

  const isEditing = editing !== null;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(isEditing ? updateClassInput : createClassInput),
    defaultValues: toFormValues(),
  });

  const scheduleArray = useFieldArray({ control: form.control, name: 'schedule' });

  // Filter modality options by the selected school when possible, else show all.
  const selectedSchoolId = form.watch('schoolId');
  const modalityOptions = useMemo(() => {
    if (!selectedSchoolId) return schoolModalities;
    const filtered = schoolModalities.filter((m) => m.schoolId === selectedSchoolId);
    return filtered.length > 0 ? filtered : schoolModalities;
  }, [schoolModalities, selectedSchoolId]);

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(klass: Class) {
    setEditing(klass);
    form.reset(toFormValues(klass));
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      form.reset(toFormValues());
    }
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: classKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: ClassFormValues) => classesApi.create(toCreatePayload(values)),
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
    mutationFn: (values: ClassFormValues) => {
      if (!editing) throw new Error('No class selected');
      const payload = toCreatePayload(values);
      // Update DTO does not accept schoolId / schoolModalityId.
      return classesApi.update(editing.id, {
        name: payload.name,
        ageGroup: payload.ageGroup,
        location: payload.location,
        capacity: payload.capacity,
        schedule: payload.schedule,
      });
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
    mutationFn: (id: string) => classesApi.remove(id),
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

  function onSubmit(values: ClassFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<Class, unknown>[] = [
    {
      accessorKey: 'name',
      header: () => t('admin.classes.name'),
      cell: ({ row }) => row.original.name,
    },
    {
      id: 'school',
      header: () => t('admin.classes.school'),
      cell: ({ row }) => schoolNameById.get(row.original.schoolId) ?? row.original.schoolId,
    },
    {
      accessorKey: 'ageGroup',
      header: () => t('admin.classes.ageGroup'),
      cell: ({ row }) => row.original.ageGroup ?? '—',
    },
    {
      accessorKey: 'location',
      header: () => t('admin.classes.location'),
      cell: ({ row }) => row.original.location ?? '—',
    },
    {
      accessorKey: 'capacity',
      header: () => t('admin.classes.capacity'),
      cell: ({ row }) => (row.original.capacity != null ? row.original.capacity : '—'),
    },
    {
      id: 'schedule',
      header: () => t('admin.classes.schedule'),
      cell: ({ row }) => {
        const schedule = row.original.schedule;
        if (!schedule || schedule.length === 0) return '—';
        return schedule
          .map((s) => `${WEEKDAYS[s.weekday] ?? s.weekday} ${s.start}-${s.end}`)
          .join(', ');
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {canUpdate && (
            <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
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
      <p className="text-sm text-muted-foreground">{t('admin.classes.empty')}</p>
      {canCreate && <Button onClick={openCreate}>{t('admin.classes.new')}</Button>}
    </div>
  );

  const selectClass =
    'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t('admin.classes.new')}</Button>
        </div>
      )}

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.classes.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.school')}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass} disabled={isEditing}>
                        <option value="">—</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
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
                name="schoolModalityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.schoolModality')}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass} disabled={isEditing}>
                        <option value="">—</option>
                        {modalityOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id}
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
                name="ageGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.ageGroup')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.location')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.classes.capacity')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>{t('admin.classes.schedule')}</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => scheduleArray.append({ weekday: 1, start: '', end: '' })}
                  >
                    {t('admin.classes.addSchedule')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {scheduleArray.fields.map((row, index) => (
                    <div key={row.id} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor={`schedule.${index}.weekday`}
                        >
                          {t('admin.classes.weekday')}
                        </label>
                        <select
                          id={`schedule.${index}.weekday`}
                          className={selectClass}
                          {...form.register(`schedule.${index}.weekday` as const, {
                            valueAsNumber: true,
                          })}
                        >
                          {WEEKDAYS.map((label, value) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor={`schedule.${index}.start`}
                        >
                          {t('admin.classes.start')}
                        </label>
                        <Input
                          id={`schedule.${index}.start`}
                          type="time"
                          {...form.register(`schedule.${index}.start` as const)}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor={`schedule.${index}.end`}
                        >
                          {t('admin.classes.end')}
                        </label>
                        <Input
                          id={`schedule.${index}.end`}
                          type="time"
                          {...form.register(`schedule.${index}.end` as const)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={() => scheduleArray.remove(index)}
                        disabled={scheduleArray.fields.length <= 1}
                      >
                        {t('admin.actions.delete')}
                      </Button>
                    </div>
                  ))}
                </div>
                {form.formState.errors.schedule && (
                  <p className="text-xs font-medium text-danger">
                    {form.formState.errors.schedule.message ??
                      form.formState.errors.schedule.root?.message}
                  </p>
                )}
              </div>

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
                  {isSaving ? t('admin.actions.saving') : t('admin.actions.save')}
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
          <p className="text-sm text-muted-foreground">{t('admin.actions.confirmDelete')}</p>
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
              {deleteMutation.isPending ? t('admin.actions.saving') : t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
