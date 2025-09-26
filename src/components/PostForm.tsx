import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Post } from '@/services/PostService';
import { Loader2, Image as ImageIcon, XCircle } from 'lucide-react';

const postSchema = z.object({
  text: z.string().min(1, { message: 'Post content cannot be empty.' }),
  image: z.any().optional(), // File object or null
});

type PostFormValues = z.infer<typeof postSchema>;

interface PostFormProps {
  initialPost?: Post; // For editing existing posts
  onSubmit: (text: string, imageFile: File | null, currentImageUrl: string | null) => Promise<boolean>;
  onCancel?: () => void;
  isLoading: boolean;
}

const PostForm: React.FC<PostFormProps> = ({ initialPost, onSubmit, onCancel, isLoading }) => {
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      text: initialPost?.text || '',
      image: undefined,
    },
  });

  const [imagePreview, setImagePreview] = useState<string | null>(initialPost?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialPost) {
      form.reset({
        text: initialPost.text,
        image: undefined, // Clear file input on edit
      });
      setImagePreview(initialPost.image_url || null);
      setImageFile(null);
    } else {
      form.reset({
        text: '',
        image: undefined,
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [initialPost, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Clear the file input value
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (values: PostFormValues) => {
    const success = await onSubmit(values.text, imageFile, initialPost?.image_url || null);
    if (success && !initialPost) {
      form.reset({ text: '', image: undefined });
      setImagePreview(null);
      setImageFile(null);
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="tw-space-y-4 tw-p-4 tw-border tw-rounded-lg tw-bg-card tw-shadow-sm">
      <div>
        <Label htmlFor="post-text">Post Content</Label>
        <Textarea
          id="post-text"
          placeholder="Enter scanner update here..."
          {...form.register('text')}
          className="tw-mt-1 tw-min-h-[100px]"
          disabled={isLoading}
        />
        {form.formState.errors.text && (
          <p className="tw-text-destructive tw-text-sm tw-mt-1">{form.formState.errors.text.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="image-upload" className="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer">
          <ImageIcon className="tw-h-4 tw-w-4" /> Upload Image (Optional)
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="tw-mt-1 tw-block tw-w-full tw-text-sm tw-text-muted-foreground file:tw-mr-4 file:tw-py-2 file:tw-px-4 file:tw-rounded-full file:tw-border-0 file:tw-text-sm file:tw-font-semibold file:tw-bg-primary file:tw-text-primary-foreground hover:file:tw-bg-primary/90"
          disabled={isLoading}
        />
        {imagePreview && (
          <div className="tw-relative tw-mt-4 tw-w-32 tw-h-32 tw-rounded-md tw-overflow-hidden">
            <img src={imagePreview} alt="Image preview" className="tw-w-full tw-h-full tw-object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="tw-absolute tw-top-1 tw-right-1 tw-h-6 tw-w-6 tw-rounded-full tw-bg-background/70 hover:tw-bg-background"
              onClick={handleRemoveImage}
              disabled={isLoading}
            >
              <XCircle className="tw-h-4 tw-w-4 tw-text-destructive" />
              <span className="tw-sr-only">Remove image</span>
            </Button>
          </div>
        )}
      </div>

      <div className="tw-flex tw-justify-end tw-gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground">
          {isLoading && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
          {initialPost ? 'Update Post' : 'Post Now'}
        </Button>
      </div>
    </form>
  );
};

export default PostForm;