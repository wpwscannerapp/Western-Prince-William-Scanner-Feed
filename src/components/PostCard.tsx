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
    <Card className="w-full bg-card border-border shadow-md text-foreground">
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground font-semibold">
          {formatPostTimestamp(post.timestamp)}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-base mb-4 whitespace-pre-wrap">{post.text}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-4 pt-0">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <Heart className="h-4 w-4 mr-1" /> Like
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <MessageCircle className="h-4 w-4 mr-1" /> Comment
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostCard;