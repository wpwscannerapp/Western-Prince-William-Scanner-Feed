"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContactCard } from "@/types/supabase"; // Updated import path

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

interface Props {
  card?: Omit<ContactCard, 'id'> & { id?: string }; // Allow optional ID for new cards
  onSave: (card: ContactCard) => void;
  onCancel: () => void;
}

export function ContactCardForm({ card, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: card?.name ?? "",
      title: card?.title ?? "",
      email: card?.email ?? "",
      phone: card?.phone ?? "",
    },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    onSave({
      id: card?.id ?? crypto.randomUUID(), // Ensure ID is always present
      name: data.name,
      title: data.title,
      email: data.email,
      phone: data.phone,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...register("phone")} />
      </div>

      <div className="flex gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}