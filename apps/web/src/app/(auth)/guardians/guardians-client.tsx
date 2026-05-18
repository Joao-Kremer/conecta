'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createGuardianInput,
  guardiansApi,
  updateGuardianInput,
  type CreateGuardianInput,
  type Guardian,
} from './guardians.api';

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
import { guardianKeys } from '@/lib/query-keys';


interface GuardiansClientProps {
  initialData: Guardian[];
}

interface GuardianFormValues {
  fullName: string;
  document: string;
  phone: string;
  email: string;
}

function toFormValues(guardian?: Guardian): GuardianFormValues {
  return {
    fullName: guardian?.fullName ?? '',
    document: guardian?.document ?? '',
    phone: guardian?.phone ?? '',
    email: guardian?.email ?? '',
  };
}

// Trims empty optional strings to undefined so they aren't sent as ''.
function toPayload(values: GuardianFormValues): CreateGuardianInput {
  return {
    fullName: values.fullName,
    document: values.document.trim() === '' ? undefined : values.document,
    phone: values.phone,
    email: values.email,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function GuardiansClient({ initialData }: GuardiansClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guardian | null>(null);

  const canCreate = ability.can('create', 'Guardian');
  const canUpdate = ability.can('update', 'Guardian');
  const canDelete = ability.can('delete', 'Guardian');

  const { data } = useQuery({
    queryKey: guardianKeys.list(),
    queryFn: () => guardiansApi.list(),
    initialData,
  });

  const isEditing = editing !== null;

  const form = useForm<GuardianFormValues>({
    resolver: zodResolver(isEditing ? updateGuardianInput : createGuardianInput),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(guardian: Guardian) {
    setEditing(guardian);
    form.reset(toFormValues(guardian));
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
    queryClient.invalidateQueries({ queryKey: guardianKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: GuardianFormValues) => guardiansApi.create(toPayload(values)),
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
    mutationFn: (values: GuardianFormValues) => {
      if (!editing) throw new Error('No guardian selected');
      return guardiansApi.update(editing.id, toPayload(values));
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
    mutationFn: (id: string) => guardiansApi.remove(id),
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

  function onSubmit(values: GuardianFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<Guardian, unknown>[] = [
    {
      accessorKey: 'fullName',
      header: () => t('admin.guardians.fullName'),
      cell: ({ row }) => row.original.fullName,
    },
    {
      accessorKey: 'phone',
      header: () => t('admin.guardians.phone'),
      cell: ({ row }) => row.original.phone,
    },
    {
      accessorKey: 'email',
      header: () => t('admin.guardians.email'),
      cell: ({ row }) => row.original.email,
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
      <p className="text-sm text-muted-foreground">{t('admin.guardians.empty')}</p>
      {canCreate && (
        <Button onClick={openCreate}>{t('admin.guardians.new')}</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t('admin.guardians.new')}</Button>
        </div>
      )}

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.guardians.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.guardians.fullName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>{t('admin.guardians.document')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.guardians.phone')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.guardians.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
