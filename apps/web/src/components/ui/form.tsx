'use client';

import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type Control,
  type ControllerRenderProps,
  type FieldError,
  type FieldValues,
  type Path,
} from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const Form = FormProvider;

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  name,
  control,
  render,
}: {
  name: TName;
  control: Control<TFieldValues>;
  render: (props: { field: ControllerRenderProps<TFieldValues, TName> }) => React.ReactNode;
}) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <Controller control={control} name={name} render={({ field }) => <>{render({ field })}</>} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const { name } = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(name, formState);
  return { name, ...fieldState };
}

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  ),
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { error, name } = useFormField();
    return <Label ref={ref} className={cn(error && 'text-danger', className)} htmlFor={name} {...props} />;
  },
);
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => {
    const { error, name } = useFormField();
    return (
      <div
        ref={ref}
        id={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
    );
  },
);
FormControl.displayName = 'FormControl';

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, name } = useFormField();
    const body = error ? (error as FieldError).message : children;
    if (!body) return null;
    return (
      <p
        ref={ref}
        id={`${name}-error`}
        className={cn('text-xs font-medium text-danger', className)}
        {...props}
      >
        {body}
      </p>
    );
  },
);
FormMessage.displayName = 'FormMessage';

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage };
