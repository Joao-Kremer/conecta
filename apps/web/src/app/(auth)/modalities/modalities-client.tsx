'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createModalityInput,
  modalitiesApi,
  updateModalityInput,
  type CreateModalityInput,
  type Modality,
  type UpdateModalityInput,
} from './modalities.api';

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
import { modalityKeys } from '@/lib/query-keys';


interface ModalitiesClientProps {
  initialData: Modality[];
}

interface ModalityFormValues {
  name: string;
  description: string;
  color: string;
  active: boolean;
}

function toFormValues(modality?: Modality): ModalityFormValues {
  return {
    name: modality?.name ?? '',
    description: modality?.description ?? '',
    color: modality?.color ?? '',
    active: modality?.active ?? true,
  };
}

// Trims empty optional strings to undefined so they aren't sent as ''.
function toCreatePayload(values: ModalityFormValues): CreateModalityInput {
  return {
    name: values.name,
    description: values.description.trim() === '' ? undefined : values.description,
    color: values.color.trim() === '' ? undefined : values.color,
  };
}

function toUpdatePayload(values: ModalityFormValues): UpdateModalityInput {
  return {
    name: values.name,
    description: values.description.trim() === '' ? undefined : values.description,
    color: values.color.trim() === '' ? undefined : values.color,
    active: values.active,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function ModalitiesClient({ initialData }: ModalitiesClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Modality | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Modality | null>(null);

  const canCreate = ability.can('create', 'Modality');
  const canUpdate = ability.can('update', 'Modality');
  const canDelete = ability.can('delete', 'Modality');

  const { data } = useQuery({
    queryKey: modalityKeys.list(),
    queryFn: () => modalitiesApi.list(),
    initialData,
  });

  const isEditing = editing !== null;

  const form = useForm<ModalityFormValues>({
    resolver: zodResolver(isEditing ? updateModalityInput : createModalityInput),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(modality: Modality) {
    setEditing(modality);
    form.reset(toFormValues(modality));
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      form.reset(toFormValues());
    }
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: modalityKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: ModalityFormValues) => modalitiesApi.create(toCreatePayload(values)),
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
    mutationFn: (values: ModalityFormValues) => {
      if (!editing) throw new Error('No modality selected');
      return modalitiesApi.update(editing.id, toUpdatePayload(values));
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
    mutationFn: (id: string) => modalitiesApi.remove(id),
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

  function onSubmit(values: ModalityFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<Modality, unknown>[] = [
    {
      accessorKey: 'name',
      header: () => t('admin.modalities.name'),
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'description',
      header: () => t('admin.modalities.description'),
      cell: ({ row }) => row.original.description ?? '—',
    },
    {
      accessorKey: 'color',
      header: () => t('admin.modalities.color'),
      cell: ({ row }) =>
        row.original.color ? (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-sm border border-border"
              style={{ backgroundColor: row.original.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{row.original.color}</span>
          </span>
        ) : (
          '—'
        ),
    },
    {
      accessorKey: 'active',
      header: () => t('admin.modalities.active'),
      cell: ({ row }) => (
        <span title={t('admin.modalities.active')}>{row.original.active ? '✓' : '—'}</span>
      ),
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
      <p className="text-sm text-muted-foreground">{t('admin.modalities.empty')}</p>
      {canCreate && <Button onClick={openCreate}>{t('admin.modalities.new')}</Button>}
    </div>
  );

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t('admin.modalities.new')}</Button>
        </div>
      )}

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.modalities.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.modalities.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.modalities.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.modalities.color')}</FormLabel>
                    <FormControl>
                      <Input placeholder="#3366ff" {...field} />
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
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border accent-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          name={field.name}
                        />
                        {t('admin.modalities.active')}
                      </label>
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
              {deleteMutation.isPending ? t('admin.actions.saving') : t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
