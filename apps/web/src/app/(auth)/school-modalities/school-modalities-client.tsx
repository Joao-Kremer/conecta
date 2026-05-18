'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  modalitiesApi,
  schoolModalitiesApi,
  schoolsApi,
  type CreateSchoolModalityInput,
  type SchoolModality,
  type UpdateSchoolModalityInput,
} from './school-modalities.api';

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
import { modalityKeys, schoolKeys, schoolModalityKeys } from '@/lib/query-keys';


interface SchoolModalitiesClientProps {
  initialData: SchoolModality[];
}

// Money inputs are expressed in reais (decimal) and converted to cents on
// submit. The wrapper FormField has no `rules` prop, so validation goes
// through a zodResolver (mirrors schools-client).
const moneyField = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Number.parseFloat(v)) && Number.parseFloat(v) >= 0);

const schoolModalityFormSchema = z.object({
  schoolId: z.string().min(1),
  modalityId: z.string().min(1),
  monthlyFee: moneyField,
  enrollmentFee: moneyField,
  active: z.boolean(),
});

type SchoolModalityFormValues = z.infer<typeof schoolModalityFormSchema>;

// Native select styled to match the project Input control.
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed ' +
  'disabled:opacity-50';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2);
}

function reaisToCents(reais: string): number {
  const value = Number.parseFloat(reais);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function toFormValues(item?: SchoolModality): SchoolModalityFormValues {
  return {
    schoolId: item?.schoolId ?? '',
    modalityId: item?.modalityId ?? '',
    monthlyFee: item ? centsToReais(item.defaultMonthlyFeeCents) : '',
    enrollmentFee: item ? centsToReais(item.defaultEnrollmentFeeCents) : '0.00',
    active: item?.active ?? true,
  };
}

function toCreatePayload(values: SchoolModalityFormValues): CreateSchoolModalityInput {
  return {
    schoolId: values.schoolId,
    modalityId: values.modalityId,
    defaultMonthlyFeeCents: reaisToCents(values.monthlyFee),
    defaultEnrollmentFeeCents: reaisToCents(values.enrollmentFee),
  };
}

function toUpdatePayload(values: SchoolModalityFormValues): UpdateSchoolModalityInput {
  return {
    defaultMonthlyFeeCents: reaisToCents(values.monthlyFee),
    defaultEnrollmentFeeCents: reaisToCents(values.enrollmentFee),
    active: values.active,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function SchoolModalitiesClient({ initialData }: SchoolModalitiesClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolModality | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolModality | null>(null);

  const canCreate = ability.can('create', 'SchoolModality');
  const canUpdate = ability.can('update', 'SchoolModality');
  const canDelete = ability.can('delete', 'SchoolModality');

  const { data } = useQuery({
    queryKey: schoolModalityKeys.list(),
    queryFn: () => schoolModalitiesApi.list(),
    initialData,
  });

  const { data: schools = [] } = useQuery({
    queryKey: schoolKeys.list(),
    queryFn: () => schoolsApi.list(),
  });

  const { data: modalities = [] } = useQuery({
    queryKey: modalityKeys.list(),
    queryFn: () => modalitiesApi.list(),
  });

  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const modalityName = (id: string) => modalities.find((m) => m.id === id)?.name ?? id;

  const isEditing = editing !== null;

  const form = useForm<SchoolModalityFormValues>({
    resolver: zodResolver(schoolModalityFormSchema),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(item: SchoolModality) {
    setEditing(item);
    form.reset(toFormValues(item));
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
    queryClient.invalidateQueries({ queryKey: schoolModalityKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: SchoolModalityFormValues) =>
      schoolModalitiesApi.create(toCreatePayload(values)),
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
    mutationFn: (values: SchoolModalityFormValues) => {
      if (!editing) throw new Error('No school modality selected');
      return schoolModalitiesApi.update(editing.id, toUpdatePayload(values));
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
    mutationFn: (id: string) => schoolModalitiesApi.remove(id),
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

  function onSubmit(values: SchoolModalityFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<SchoolModality, unknown>[] = [
    {
      accessorKey: 'schoolId',
      header: () => t('admin.schoolModalities.school'),
      cell: ({ row }) => schoolName(row.original.schoolId),
    },
    {
      accessorKey: 'modalityId',
      header: () => t('admin.schoolModalities.modality'),
      cell: ({ row }) => modalityName(row.original.modalityId),
    },
    {
      accessorKey: 'defaultMonthlyFeeCents',
      header: () => t('admin.schoolModalities.monthlyFee'),
      cell: ({ row }) => formatCents(row.original.defaultMonthlyFeeCents),
    },
    {
      accessorKey: 'defaultEnrollmentFeeCents',
      header: () => t('admin.schoolModalities.enrollmentFee'),
      cell: ({ row }) => formatCents(row.original.defaultEnrollmentFeeCents),
    },
    {
      accessorKey: 'active',
      header: () => t('admin.schoolModalities.active'),
      cell: ({ row }) => (row.original.active ? '✓' : '—'),
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
      <p className="text-sm text-muted-foreground">{t('admin.schoolModalities.empty')}</p>
      {canCreate && (
        <Button onClick={openCreate}>{t('admin.schoolModalities.new')}</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t('admin.schoolModalities.new')}</Button>
        </div>
      )}

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.schoolModalities.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schoolModalities.school')}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass} disabled={isEditing}>
                        <option value="" disabled>
                          —
                        </option>
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
                name="modalityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schoolModalities.modality')}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass} disabled={isEditing}>
                        <option value="" disabled>
                          —
                        </option>
                        {modalities.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
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
                name="monthlyFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schoolModalities.monthlyFee')}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enrollmentFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schoolModalities.enrollmentFee')}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEditing && (
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          {t('admin.schoolModalities.active')}
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              {deleteMutation.isPending
                ? t('admin.actions.saving')
                : t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
