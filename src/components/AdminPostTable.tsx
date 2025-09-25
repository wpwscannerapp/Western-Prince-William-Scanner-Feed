import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Post, PostService } from '@/services/PostService';
import { formatPostTimestamp } from '@/lib/utils';
import { Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PostForm from './PostForm';

interface AdminPostTableProps {
  onPostUpdated: () => void;
}

const AdminPostTable: React.FC<AdminPostTableProps> = ({ onPostUpdated }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const fetchedPosts = await PostService.fetchPosts(0); // Fetch all posts for admin view
    setPosts(fetchedPosts);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (postId: string, imageUrl: string | null) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      toast.loading('Deleting post...', { id: 'delete-post' });
      const success = await PostService.deletePost(postId, imageUrl);
      if (success) {
        toast.success('Post deleted successfully!', { id: 'delete-post' });
        fetchPosts(); // Refresh the list
        onPostUpdated();
      } else {
        toast.error('Failed to delete post.', { id: 'delete-post' });
      }
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePost = async (text: string, imageFile: File | null, currentImageUrl: string | null) => {
    if (!editingPost) return false;

    setIsSubmitting(true);
    toast.loading('Updating post...', { id: 'update-post' });
    const updatedPost = await PostService.updatePost(editingPost.id, text, imageFile, currentImageUrl);
    setIsSubmitting(false);

    if (updatedPost) {
      toast.success('Post updated successfully!', { id: 'update-post' });
      setIsEditDialogOpen(false);
      setEditingPost(null);
      fetchPosts(); // Refresh the list
      onPostUpdated();
      return true;
    } else {
      toast.error('Failed to update post.', { id: 'update-post' });
      return false;
    }
  };

  const filteredPosts = posts.filter(post =>
    post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {formatPostTimestamp(post.timestamp)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{post.text}</TableCell>
                    <TableCell>
                      {post.image_url ? (
                        <img src={post.image_url} alt="Post" className="h-10 w-10 object-cover rounded-md" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="mr-2">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id, post.image_url)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {editingPost && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <PostForm
              initialPost={editingPost}
              onSubmit={handleUpdatePost}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminPostTable;