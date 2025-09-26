import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import { formatPostTimestamp } from '@/lib/utils';
import { Post } from '@/services/PostService';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <Card className="tw-w-full tw-bg-card tw-border-border tw-shadow-md tw-text-foreground">
      <CardHeader className="tw-pb-2">
        <p className="tw-text-sm tw-text-muted-foreground tw-font-semibold">
          {formatPostTimestamp(post.timestamp)}
        </p>
      </CardHeader>
      <CardContent>
        <p className="tw-text-base tw-mb-4 tw-whitespace-pre-wrap">{post.text}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="tw-w-full tw-h-48 tw-object-cover tw-rounded-md tw-mb-4"
          />
        )}
      </CardContent>
      <CardFooter className="tw-flex tw-justify-end tw-space-x-4 tw-pt-0">
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