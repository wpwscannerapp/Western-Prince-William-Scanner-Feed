import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Post } from '@/services/PostService';
import { toast } from 'sonner';
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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
      <div>
        <Label htmlFor="post-text">Post Content</Label>
        <Textarea
          id="post-text"
          placeholder="Enter scanner update here..."
          {...form.register('text')}
          className="mt-1 min-h-[100px]"
          disabled={isLoading}
        />
        {form.formState.errors.text && (
          <p className="text-destructive text-sm mt-1">{form.formState.errors.text.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="image-upload" className="flex items-center gap-2 cursor-pointer">
          <ImageIcon className="h-4 w-4" /> Upload Image (Optional)
        </Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          disabled={isLoading}
        />
        {imagePreview && (
          <div className="relative mt-4 w-32 h-32 rounded-md overflow-hidden">
            <img src={imagePreview} alt="Image preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/70 hover:bg-background"
              onClick={handleRemoveImage}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialPost ? 'Update Post' : 'Post Now'}
        </Button>
      </div>
    </form>
  );
};

export default PostForm;