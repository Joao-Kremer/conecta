'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createSchoolInput,
  schoolsApi,
  updateSchoolInput,
  type CreateSchoolInput,
  type School,
} from './schools.api';

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
import { schoolKeys } from '@/lib/query-keys';


interface SchoolsClientProps {
  initialData: School[];
}

interface SchoolFormValues {
  name: string;
  phone: string;
  email: string;
  timezone: string;
}

function toFormValues(school?: School): SchoolFormValues {
  return {
    name: school?.name ?? '',
    phone: school?.phone ?? '',
    email: school?.email ?? '',
    timezone: school?.timezone ?? '',
  };
}

// Trims empty optional strings to undefined so they aren't sent as ''.
function toPayload(values: SchoolFormValues): CreateSchoolInput {
  return {
    name: values.name,
    phone: values.phone.trim() === '' ? undefined : values.phone,
    email: values.email.trim() === '' ? undefined : values.email,
    timezone: values.timezone.trim() === '' ? undefined : values.timezone,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function SchoolsClient({ initialData }: SchoolsClientProps) {
  const t = useTranslations();
  const ability = useAbility();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  const canCreate = ability.can('create', 'School');
  const canUpdate = ability.can('update', 'School');
  const canDelete = ability.can('delete', 'School');

  const { data } = useQuery({
    queryKey: schoolKeys.list(),
    queryFn: () => schoolsApi.list(),
    initialData,
  });

  const isEditing = editing !== null;

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(isEditing ? updateSchoolInput : createSchoolInput),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setEditing(null);
    form.reset(toFormValues());
    setDialogOpen(true);
  }

  function openEdit(school: School) {
    setEditing(school);
    form.reset(toFormValues(school));
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
    queryClient.invalidateQueries({ queryKey: schoolKeys.all });

  const createMutation = useMutation({
    mutationFn: (values: SchoolFormValues) => schoolsApi.create(toPayload(values)),
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
    mutationFn: (values: SchoolFormValues) => {
      if (!editing) throw new Error('No school selected');
      return schoolsApi.update(editing.id, toPayload(values));
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
    mutationFn: (id: string) => schoolsApi.remove(id),
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

  function onSubmit(values: SchoolFormValues) {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<School, unknown>[] = [
    {
      accessorKey: 'name',
      header: () => t('admin.schools.name'),
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'phone',
      header: () => t('admin.schools.phone'),
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'email',
      header: () => t('admin.schools.email'),
      cell: ({ row }) => row.original.email ?? '—',
    },
    {
      accessorKey: 'status',
      header: () => t('admin.schools.status'),
      cell: ({ row }) => row.original.status,
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
      <p className="text-sm text-muted-foreground">{t('admin.schools.empty')}</p>
      {canCreate && (
        <Button onClick={openCreate}>{t('admin.schools.new')}</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t('admin.schools.new')}</Button>
        </div>
      )}

      <DataTable columns={columns} data={data} emptyState={emptyState} />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('admin.actions.edit') : t('admin.schools.new')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schools.name')}</FormLabel>
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
                    <FormLabel>{t('admin.schools.phone')}</FormLabel>
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
                    <FormLabel>{t('admin.schools.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.schools.timezone')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
