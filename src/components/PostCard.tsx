import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import { Post } from '@/services/PostService';
import PostHeader from './PostHeader'; // Import the new PostHeader component

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  // For now, we'll assume a post is an admin post if admin_id is present.
  // In a real app, you might fetch admin details or have a specific flag.
  const isAdminPost = !!post.admin_id;

  return (
    <Card className="tw-w-full tw-bg-card tw-border tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg">
      <div className="tw-p-4 tw-pb-2"> {/* Padding for header content */}
        <PostHeader timestamp={post.timestamp} isAdminPost={isAdminPost} />
      </div>
      <CardContent className="tw-pt-2 tw-px-4 tw-pb-4">
        <p className="tw-text-base tw-mb-4 tw-whitespace-pre-wrap">{post.text}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="tw-w-full tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
          />
        )}
      </CardContent>
      <CardFooter className="tw-flex tw-justify-end tw-space-x-4 tw-pt-0 tw-pb-4 tw-px-4">
        <Button variant="ghost" size="sm" className="tw-text-muted-foreground hover:tw-text-primary">
          <Heart className="tw-h-4 tw-w-4 tw-mr-1" /> Like
        </Button>
        <Button variant="ghost" size="sm" className="tw-text-muted-foreground hover:tw-text-primary">
          <MessageCircle className="tw-h-4 tw-w-4 tw-mr-1" /> Comment
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostCard;