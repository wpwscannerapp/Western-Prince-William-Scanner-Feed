"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, XCircle, User, CheckCircle2, XCircle as XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, Profile } from '@/services/ProfileService';
import { StorageService } from '@/services/StorageService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useDebounce from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

const profileSchema = z.object({
  first_name: z.string().max(50, { message: 'First name too long.' }).optional().or(z.literal('')),
  last_name: z.string().max(50, { message: 'Last name too long.' }).optional().or(z.literal('')),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(20, { message: 'Username must be at most 20 characters.' })
    .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores.' })
    .optional()
    .or(z.literal('')),
  avatar: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery<Profile | null, Error>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return ProfileService.fetchProfile(user.id);
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation<Profile | null, Error, { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; username?: string | null }>({
    mutationFn: (updates) => user ? ProfileService.updateProfile(user.id, updates) : Promise.resolve(null),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      AnalyticsService.trackEvent({ name: 'profile_form_updated', properties: { userId: user?.id } });
    },
    onError: (error) => {
      if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        toast.error('Username already taken. Please choose another.');
        AnalyticsService.trackEvent({ name: 'profile_form_update_failed', properties: { userId: user?.id, reason: 'username_taken' } });
      } else {
        toast.error(`Failed to update profile: ${error.message}`);
        AnalyticsService.trackEvent({ name: 'profile_form_update_failed', properties: { userId: user?.id, reason: 'unexpected_error', error: error.message } });
      }
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '',
      avatar: undefined,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);

  const currentUsernameValue = form.watch('username');
  const debouncedUsername = useDebounce(currentUsernameValue, 500);

  // Effect to revoke object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]); // Depend on imagePreview to revoke old URL when it changes

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: profile.username || '',
        avatar: undefined,
      });
      // Ensure imagePreview is null if avatar_url is an empty string
      // Revoke old object URL if it exists and is a local one
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(profile.avatar_url || null);
    }
  }, [profile, form]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    if (username === profile?.username) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus('checking');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id)
        .limit(1);

      if (error) {
        setUsernameStatus(null);
        AnalyticsService.trackEvent({ name: 'username_check_failed', properties: { username, error: error.message } });
        return;
      }

      if (data && data.length > 0) {
        setUsernameStatus('taken');
        AnalyticsService.trackEvent({ name: 'username_checked', properties: { username, status: 'taken' } });
      } else {
        setUsernameStatus('available');
        AnalyticsService.trackEvent({ name: 'username_checked', properties: { username, status: 'available' } }); // Fixed: Added missing '}'
      }
    } catch (err) {
      setUsernameStatus(null);
      AnalyticsService.trackEvent({ name: 'username_check_unexpected_error', properties: { username, error: (err as Error).message } });
    }
  };

  useEffect(() => {
    if (debouncedUsername !== undefined && debouncedUsername !== profile?.username) {
      checkUsernameAvailability(debouncedUsername);
    } else if (debouncedUsername === profile?.username) {
      setUsernameStatus(null);
    } else {
      setUsernameStatus(null);
    }
  }, [debouncedUsername, profile?.username, user?.id]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous object URL if it exists
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      AnalyticsService.trackEvent({ name: 'avatar_image_selected', properties: { fileName: file.name, fileSize: file.size } });
    } else {
      // Revoke current object URL if it exists
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
      setImageFile(null);
      setImagePreview(profile?.avatar_url || null);
      AnalyticsService.trackEvent({ name: 'avatar_image_selection_cleared' });
    }
  };

  const handleRemoveImage = () => {
    // Revoke current object URL if it exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    AnalyticsService.trackEvent({ name: 'avatar_image_removed_from_preview' });
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current && !isSubmitDisabled) {
      fileInputRef.current.click();
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      AnalyticsService.trackEvent({ name: 'profile_update_attempt_failed', properties: { reason: 'not_logged_in' } }); // Fixed: Added missing '}'
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'checking') {
      toast.error('Please resolve username issues before saving.');
      AnalyticsService.trackEvent({ name: 'profile_update_attempt_failed', properties: { reason: 'username_issue', usernameStatus } });
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
          AnalyticsService.trackEvent({ name: 'old_avatar_deleted', properties: { userId: user.id } });
        }
        avatarUrl = newAvatarUrl;
        toast.success('Avatar uploaded!', { id: 'avatar-upload' });
      } else {
        toast.error('Failed to upload avatar.', { id: 'avatar-upload' });
        setIsUploading(false);
        AnalyticsService.trackEvent({ name: 'avatar_upload_failed', properties: { userId: user.id } });
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
        AnalyticsService.trackEvent({ name: 'avatar_removed', properties: { userId: user.id } });
      } else {
        toast.error('Failed to remove avatar.', { id: 'avatar-remove' });
        setIsUploading(false);
        AnalyticsService.trackEvent({ name: 'avatar_remove_failed', properties: { userId: user.id } });
        return;
      }
      setIsUploading(false);
    } else {
      avatarUrl = profile?.avatar_url;
    }

    const updates = {
      first_name: values.first_name || null,
      last_name: values.last_name || null,
      username: values.username || null,
      avatar_url: avatarUrl,
    };

    updateProfileMutation.mutate(updates);
  };

  if (isProfileLoading) {
    return (
      <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading profile data" />
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

  const isSubmitDisabled = updateProfileMutation.isPending || isUploading || usernameStatus === 'checking' || usernameStatus === 'taken';

  // Determine the avatar source: local blob URL if a file is selected, otherwise Netlify CDN for hosted images.
  const avatarSrc = imageFile 
    ? imagePreview || undefined // Use blob URL directly for local file preview, convert null to undefined
    : (imagePreview && imagePreview.trim() !== '') 
      ? `/.netlify/images?url=${encodeURIComponent(imagePreview)}&w=96&h=96&fit=cover&fm=auto` 
      : undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6 tw-p-6 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
        <div className="tw-relative tw-group">
          <div 
            className={`tw-h-24 tw-w-24 tw-rounded-full tw-border-2 tw-border-primary tw-cursor-pointer ${isSubmitDisabled ? 'tw-cursor-not-allowed tw-opacity-70' : ''}`}
            onClick={handleAvatarClick}
            role="button"
            tabIndex={isSubmitDisabled ? -1 : 0}
            aria-label="Change avatar image"
          >
            <Avatar className="tw-h-full tw-w-full">
              <AvatarImage 
                src={avatarSrc} 
                alt="User Avatar" 
              />
              <AvatarFallback className="tw-bg-primary tw-text-primary-foreground tw-text-xl">
                {profile?.first_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || <User className="tw-h-12 tw-w-12" aria-hidden="true" />}
              </AvatarFallback>
            </Avatar>
            <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black/50 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-cursor-pointer tw-rounded-full">
              <Camera className="tw-h-6 tw-w-6 tw-text-white" aria-hidden="true" />
              <span className="tw-sr-only">Change avatar</span>
            </div>
          </div>
          
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="tw-hidden"
            ref={fileInputRef}
            disabled={isSubmitDisabled}
            aria-label="Upload new avatar image"
          />
          
          {(imagePreview || profile?.avatar_url) && (imageFile || profile?.avatar_url) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="tw-absolute tw-top-0 tw-right-0 tw-h-7 tw-w-7 tw-rounded-full tw-bg-background/70 hover:tw-bg-background tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-button"
              onClick={handleRemoveImage}
              disabled={isSubmitDisabled}
              aria-label="Remove avatar image"
            >
              <XCircle className="tw-h-4 tw-w-4 tw-text-destructive" aria-hidden="true" />
              <span className="tw-sr-only">Remove avatar</span>
            </Button>
          )}
        </div>
        <p className="tw-text-sm tw-text-muted-foreground">Click avatar to change</p>
      </div>

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
        <div>
          <Label htmlFor="first_name" className="tw-mb-2 tw-block">First Name</Label>
          <Input
            id="first_name"
            placeholder="John"
            {...form.register('first_name')}
            className="tw-input"
            disabled={isSubmitDisabled}
            aria-invalid={form.formState.errors.first_name ? "true" : "false"}
            aria-describedby={form.formState.errors.first_name ? "first-name-error" : undefined}
          />
          {form.formState.errors.first_name && (
            <p id="first-name-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="last_name" className="tw-mb-2 tw-block">Last Name</Label>
          <Input
            id="last_name"
            placeholder="Doe"
            {...form.register('last_name')}
            className="tw-input"
            disabled={isSubmitDisabled}
            aria-invalid={form.formState.errors.last_name ? "true" : "false"}
            aria-describedby={form.formState.errors.last_name ? "last-name-error" : undefined}
          />
          {form.formState.errors.last_name && (
            <p id="last-name-error" className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
          <Label htmlFor="username">Username</Label>
          {usernameStatus === 'checking' && <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin tw-text-muted-foreground" aria-label="Checking username availability" />}
          {usernameStatus === 'available' && <CheckCircle2 className="tw-h-4 tw-w-4 tw-text-green-500" aria-label="Username available" />}
          {usernameStatus === 'taken' && <XCircleIcon className="tw-h-4 tw-w-4 tw-text-destructive" aria-label="Username taken" />}
        </div>
        <Input
          id="username"
          placeholder="Enter your username"
          {...form.register('username')}
          className="tw-input"
          disabled={isSubmitDisabled}
          aria-invalid={form.formState.errors.username || usernameStatus === 'taken' ? "true" : "false"}
          aria-describedby={form.formState.errors.username || usernameStatus === 'taken' ? "username-error" : undefined}
        />
        {form.formState.errors.username && (
          <p id="username-error" className="tw-text-destructive tw-text-sm tw-mt-1">
            {form.formState.errors.username.message}
          </p>
        )}
        {usernameStatus === 'taken' && !form.formState.errors.username && (
          <p id="username-error" className="tw-text-destructive tw-text-sm tw-mt-1">
            This username is already taken.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className="tw-mb-2 tw-block">Email</Label>
        <Input
          id="email"
          type="email"
          value={user?.email || ''}
          disabled
          className="tw-bg-muted tw-input"
          aria-label="User email address (disabled)"
        />
        <p className="tw-text-xs tw-text-muted-foreground tw-mt-1">Email cannot be changed here.</p>
      </div>

      <Button 
        type="submit" 
        className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground tw-button" 
        disabled={isSubmitDisabled}
      >
        {(updateProfileMutation.isPending || isUploading) && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" aria-hidden="true" />}
        Save Changes
      </Button>
    </form>
  );
};

export default ProfileForm;