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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PostForm from './PostForm';
import { Link } from 'react-router-dom';

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
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPosts = await PostService.fetchPosts(0);
      setPosts(fetchedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (postId: string, imageUrl: string | null) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        toast.loading('Deleting post...', { id: 'delete-post' });
        const success = await PostService.deletePost(postId, imageUrl);
        if (success) {
          toast.success('Post deleted successfully!', { id: 'delete-post' });
          fetchPosts();
          onPostUpdated();
        } else {
          toast.error('Failed to delete post.', { id: 'delete-post' });
        }
      } catch (err) {
        console.error('Error deleting post:', err);
        toast.error('An error occurred while deleting the post.', { id: 'delete-post' });
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
    try {
      toast.loading('Updating post...', { id: 'update-post' });
      const updatedPost = await PostService.updatePost(editingPost.id, text, imageFile, currentImageUrl);
      
      if (updatedPost) {
        toast.success('Post updated successfully!', { id: 'update-post' });
        setIsEditDialogOpen(false);
        setEditingPost(null);
        fetchPosts();
        onPostUpdated();
        return true;
      } else {
        toast.error('Failed to update post.', { id: 'update-post' });
        return false;
      }
    } catch (err) {
      console.error('Error updating post:', err);
      toast.error('An error occurred while updating the post.', { id: 'update-post' });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetry = () => {
    setError(null);
    fetchPosts();
  };

  if (error) {
    return (
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-8">
        <p className="tw-text-destructive tw-mb-4">Error: {error}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-gap-2">
        <div className="tw-relative tw-w-full">
          <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tw-pl-10 tw-w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        </div>
      ) : (
        <div className="tw-border tw-rounded-md tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-whitespace-nowrap">Timestamp</TableHead>
                <TableHead className="tw-min-w-[200px]">Content</TableHead>
                <TableHead className="tw-whitespace-nowrap">Image</TableHead>
                <TableHead className="tw-text-right tw-whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    {searchTerm ? 'No posts match your search.' : 'No posts found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => (
                  <TableRow key={post.id} className="tw-break-words">
                    <TableCell className="tw-font-medium tw-whitespace-nowrap">
                      {formatPostTimestamp(post.timestamp)}
                    </TableCell>
                    <TableCell className="tw-max-w-xs tw-truncate">
                      <Link to={`/posts/${post.id}`} className="tw-text-primary hover:tw-underline">
                        {post.text}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {post.image_url ? (
                        <img 
                          src={post.image_url} 
                          alt="Post" 
                          className="tw-h-10 tw-w-10 tw-object-cover tw-rounded-md" 
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.parentElement!.innerHTML = '<span class="tw-text-muted-foreground">Image</span>';
                          }}
                        />
                      ) : (
                        <span className="tw-text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="tw-text-right tw-whitespace-nowrap">
                      <div className="tw-flex tw-justify-end tw-gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(post)}
                          className="tw-h-8 tw-w-8"
                        >
                          <Edit className="tw-h-4 tw-w-4" />
                          <span className="tw-sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(post.id, post.image_url || null)}
                          className="tw-h-8 tw-w-8"
                        >
                          <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" />
                          <span className="tw-sr-only">Delete</span>
                        </Button>
                      </div>
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
          <DialogContent className="sm:tw-max-w-[425px]">
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