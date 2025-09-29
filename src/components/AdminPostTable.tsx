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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Post, PostService } from '@/services/PostService';
import { formatPostTimestamp } from '@/lib/utils';
import { Edit, Trash2, Search, Loader2, Filter } from 'lucide-react';
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
  const [filter, setFilter] = useState('all');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const fetchedPosts = await PostService.fetchPosts(0);
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
        fetchPosts();
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
      fetchPosts();
      onPostUpdated();
      return true;
    } else {
      toast.error('Failed to update post.', { id: 'update-post' });
      return false;
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'with-image' && post.image_url) || 
                         (filter === 'without-image' && !post.image_url);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2 sm:tw-gap-4">
        <div className="tw-relative tw-flex-1">
          <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tw-pl-10 tw-w-full"
          />
        </div>
        <div className="tw-flex tw-gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="tw-w-[180px]">
              <Filter className="tw-h-4 tw-w-4 tw-mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="with-image">With Image</SelectItem>
              <SelectItem value="without-image">Without Image</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        </div>
      ) : (
        <div className="tw-rounded-md tw-border tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-min-w-[150px]">Timestamp</TableHead>
                <TableHead className="tw-min<dyad-write path="src/components/AdminPostTable.tsx" description="Improving AdminPostTable with better mobile responsiveness and filtering (continued)">
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Post, PostService } from '@/services/PostService';
import { formatPostTimestamp } from '@/lib/utils';
import { Edit, Trash2, Search, Loader2, Filter } from 'lucide-react';
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
  const [filter, setFilter] = useState('all');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const fetchedPosts = await PostService.fetchPosts(0);
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
        fetchPosts();
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
      fetchPosts();
      onPostUpdated();
      return true;
    } else {
      toast.error('Failed to update post.', { id: 'update-post' });
      return false;
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'with-image' && post.image_url) || 
                         (filter === 'without-image' && !post.image_url);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="tw-space-y-4">
      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2 sm:tw-gap-4">
        <div className="tw-relative tw-flex-1">
          <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tw-pl-10 tw-w-full"
          />
        </div>
        <div className="tw-flex tw-gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="tw-w-[180px]">
              <Filter className="tw-h-4 tw-w-4 tw-mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="with-image">With Image</SelectItem>
              <SelectItem value="without-image">Without Image</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        </div>
      ) : (
        <div className="tw-rounded-md tw-border tw-overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw-min-w-[150px]">Timestamp</TableHead>
                <TableHead className="tw-min-w-[200px]">Content</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="tw-text-right tw-min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="tw-h-24 tw-text-center tw-text-muted-foreground">
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="tw-font-medium">
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
                          loading="lazy"
                        />
                      ) : (
                        <span className="tw-text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="tw-text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="tw-mr-2">
                        <Edit className="tw-h-4 tw-w-4" />
                        <span className="tw-sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(post.id, post.image_url || null)}
                      >
                        <Trash2 className="tw-h-4 tw-w-4 tw-text-destructive" />
                        <span className="tw-sr-only">Delete</span>
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
          <DialogContent className="sm:tw-max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <PostForm
              initialPost={editingPost}
              onSubmit={(text, imageFile, currentImageUrl) => 
                handleUpdatePost(text, imageFile, currentImageUrl)
              }
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