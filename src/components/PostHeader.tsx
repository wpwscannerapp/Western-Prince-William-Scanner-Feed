import React from 'react';
import { formatPostTimestamp } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface PostHeaderProps {
  timestamp: string;
  isAdminPost: boolean;
}

const PostHeader: React.FC<PostHeaderProps> = ({ timestamp, isAdminPost }) => {
  return (
    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
      <p className="tw-text-sm tw-text-muted-foreground tw-font-medium">
        {formatPostTimestamp(timestamp)}
      </p>
      {isAdminPost && (
        <Badge variant="secondary" className="tw-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5">
          <Shield className="tw-h-3 tw-w-3" />
          Admin Post
        </Badge>
      )}
    </div>
  );
};

export default PostHeader;