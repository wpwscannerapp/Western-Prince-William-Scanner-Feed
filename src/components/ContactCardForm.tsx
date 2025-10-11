import { useFormContext, FieldPath, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ContactCard } from '@/services/SettingsService'; // Import the ContactCard interface

interface ContactCardFormProps<TFieldValues extends FieldValues = FieldValues> {
  index: number;
  remove: (index: number) => void;
  isLoading: boolean;
  fieldPrefix: FieldPath<TFieldValues>; // Prefix for field names, e.g., 'contact_cards.0'
}

const ContactCardForm = <TFieldValues extends FieldValues = FieldValues>({
  index,
  remove,
  isLoading,
  fieldPrefix,
}: ContactCardFormProps<TFieldValues>) => {
  const { register, formState: { errors } } = useFormContext<TFieldValues>();

  const getFieldName = (fieldName: keyof ContactCard) =>
    `${fieldPrefix}.${fieldName}` as FieldPath<TFieldValues>;

  const nameError = errors[getFieldName('name')]?.message as string | undefined;
  const titleError = errors[getFieldName('title')]?.message as string | undefined;
  const emailError = errors[getFieldName('email')]?.message as string | undefined;
  const phoneError = errors[getFieldName('phone')]?.message as string | undefined;

  return (
    <div className="tw-p-4 tw-border tw-rounded-md tw-bg-muted/20 tw-space-y-3">
      <div className="tw-flex tw-justify-end">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={() => remove(index)}
          disabled={isLoading}
          aria-label={`Remove contact card ${index + 1}`}
        >
          <Trash2 className="tw-h-4 tw-w-4" />
        </Button>
      </div>
      <div>
        <Label htmlFor={getFieldName('name')} className="tw-mb-1 tw-block">Name</Label>
        <Input
          id={getFieldName('name')}
          placeholder="John Doe"
          {...register(getFieldName('name'))}
          className="tw-input"
          disabled={isLoading}
        />
        {nameError && <p className="tw-text-destructive tw-text-sm tw-mt-1">{nameError}</p>}
      </div>
      <div>
        <Label htmlFor={getFieldName('title')} className="tw-mb-1 tw-block">Title</Label>
        <Input
          id={getFieldName('title')}
          placeholder="Support Specialist"
          {...register(getFieldName('title'))}
          className="tw-input"
          disabled={isLoading}
        />
        {titleError && <p className="tw-text-destructive tw-text-sm tw-mt-1">{titleError}</p>}
      </div>
      <div>
        <Label htmlFor={getFieldName('email')} className="tw-mb-1 tw-block">Email</Label>
        <Input
          id={getFieldName('email')}
          type="email"
          placeholder="john.doe@example.com"
          {...register(getFieldName('email'))}
          className="tw-input"
          disabled={isLoading}
        />
        {emailError && <p className="tw-text-destructive tw-text-sm tw-mt-1">{emailError}</p>}
      </div>
      <div>
        <Label htmlFor={getFieldName('phone')} className="tw-mb-1 tw-block">Phone Number</Label>
        <Input
          id={getFieldName('phone')}
          placeholder="+1 (555) 123-4567"
          {...register(getFieldName('phone'))}
          className="tw-input"
          disabled={isLoading}
        />
        {phoneError && <p className="tw-text-destructive tw-text-sm tw-mt-1">{phoneError}</p>}
      </div>
    </div>
  );
};

export default ContactCardForm;