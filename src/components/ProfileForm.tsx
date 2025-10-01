import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, XCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, Profile } from '@/services/ProfileService';
import { StorageService } from '@/services/StorageService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const profileSchema = z.object({
  first_name: z.string().max(50, { message: 'First name too long.' }).optional().or(z.literal('')),
  last_name: z.string().max(50, { message: 'Last name too long.' }).optional().or(z.literal('')),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(20, { message: 'Username must be at most 20 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores.' })
    .optional()
    .or(z.literal('')), // Allow empty string for optional username
  avatar: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? ProfileService.fetchProfile(user.id) : Promise.resolve(null),
    enabled: !!user,
  });

  const updateProfileMutation = useMutation<Profile | null, Error, { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null }>({
    mutationFn: (updates) => user ? ProfileService.updateProfile(user.id, updates) : Promise.resolve(null),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error) => {
      if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        toast.error('Username already taken. Please choose another.');
      } else {
        toast.error(`Failed to update profile: ${error.message}`);
      }
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '', // Initialize username
      avatar: undefined,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: profile.username || '', // Set username from fetched profile
        avatar: undefined, // Clear file input on edit
      });
      setImagePreview(profile.avatar_url || null);
    }
  }, [profile, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(profile?.avatar_url || null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return;
    }

    let avatarUrl: string | null | undefined = profile?.avatar_url;

    if (imageFile) {
      setIsUploading(true);
      toast.loading('Uploading avatar...', { id: 'avatar-upload' });
      const newAvatarUrl = await StorageService.uploadImage(imageFile);
      if (newAvatarUrl) {
        if (profile?.avatar_url) {
          await StorageService.deleteImage(profile.avatar_url);
        }
        avatarUrl = newAvatarUrl;
        toast.success('Avatar uploaded!', { id: 'avatar-upload' });
      } else {
        toast.error('Failed to upload avatar.', { id: 'avatar-upload' });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (imagePreview === null && profile?.avatar_url) {
      setIsUploading(true);
      toast.loading('Removing avatar...', { id: 'avatar-remove' });
      const success = await StorageService.deleteImage(profile.avatar_url);
      if (success) {
        avatarUrl = null;
        toast.success('Avatar removed!', { id: 'avatar-remove' });
      } else {
        toast.error('Failed to remove avatar.', { id: 'avatar-remove' });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (imagePreview === null && !profile?.avatar_url) {
      avatarUrl = null;
    } else {
      avatarUrl = profile?.avatar_url;
    }

    const updates = {
      first_name: values.first_name || null,
      last_name: values.last_name || null,
      username: values.username || null, // Include username in updates
      avatar_url: avatarUrl,
    };

    updateProfileMutation.mutate(updates);
  };

  if (isProfileLoading) {
    return (
      <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2 tw-text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="tw-text-center tw-text-destructive tw-py-8">
        Error loading profile: {profileError.message}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6 tw-p-6 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
        <div className="tw-relative tw-group">
          <Avatar className="tw-h-24 tw-w-24 tw-border-2 tw-border-primary">
            <AvatarImage src={imagePreview || undefined} alt="User Avatar" />
            <AvatarFallback className="tw-bg-primary tw-text-primary-foreground tw-text-xl">
              {profile?.first_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || <User className="tw-h-12 tw-w-12" />}
            </AvatarFallback>
          </Avatar>
          <Label htmlFor="avatar-upload" className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black/50 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-cursor-pointer tw-rounded-full">
            <Camera className="tw-h-6 tw-w-6 tw-text-white" />
            <span className="tw-sr-only">Change avatar</span>
          </Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="tw-hidden"
            ref={fileInputRef}
            disabled={updateProfileMutation.isPending || isUploading}
            aria-label="Upload new avatar image"
          />
          {(imagePreview || profile?.avatar_url) && (imageFile || profile?.avatar_url) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="tw-absolute tw-top-0 tw-right-0 tw-h-7 tw-w-7 tw-rounded-full tw-bg-background/70 hover:tw-bg-background tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-button"
              onClick={handleRemoveImage}
              disabled={updateProfileMutation.isPending || isUploading}
              aria-label="Remove avatar image"
            >
              <XCircle className="tw-h-4 tw-w-4 tw-text-destructive" />
              <span className="tw-sr-only">Remove avatar</span>
            </Button>
          )}
        </div>
        <p className="tw-text-sm tw-text-muted-foreground">Click avatar to change</p>
      </div>

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            placeholder="John"
            {...form.register('first_name')}
            className="tw-mt-1 tw-input"
            disabled={updateProfileMutation.isPending || isUploading}
            aria-invalid={form.formState.errors.first_name ? "true" : "false"}
            aria-describedby={form.formState.errors.first_name ? "first-name-error" : undefined}
          />
          {form.formState.errors.first_name && (
            <p id="first-name-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            placeholder="Doe"
            {...form.register('last_name')}
            className="tw-mt-1 tw-input"
            disabled={updateProfileMutation.isPending || isUploading}
            aria-invalid={form.formState.errors.last_name ? "true" : "false"}
            aria-describedby={form.formState.errors.last_name ? "last-name-error" : undefined}
          />
          {form.formState.errors.last_name && (
            <p id="last-name-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Enter your username"
          {...form.register('username')}
          className="tw-mt-1 tw-input"
          disabled={updateProfileMutation.isPending || isUploading}
          aria-invalid={form.formState.errors.username ? "true" : "false"}
          aria-describedby={form.formState.errors.username ? "username-error" : undefined}
        />
        {form.formState.errors.username && (
          <p id="username-error" className="tw-text-destructive tw-text-sm tw-mt-1">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user?.email || ''}
          disabled
          className="tw-mt-1 tw-bg-muted tw-input"
          aria-label="User email address (disabled)"
        />
        <p className="tw-text-xs tw-text-muted-foreground tw-mt-1">Email cannot be changed here.</p>
      </div>

      <Button 
        type="submit" 
        className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-button" 
        disabled={updateProfileMutation.isPending || isUploading}
      >
        {(updateProfileMutation.isPending || isUploading) && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
};

export default ProfileForm;