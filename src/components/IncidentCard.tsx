import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarDays, MapPin, Tag, FileText, Heart, MessageCircle, Loader2, Shield } from 'lucide-react';
import { Incident } from '@/services/IncidentService';
import { LikeService } from '@/services/LikeService';
import { CommentService } from '@/services/CommentService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import IncidentMap from './IncidentMap'; // Import IncidentMap
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface IncidentCardProps {
  incident: Incident;
}

const IncidentCard: React.FC<IncidentCardProps> = React.memo(({ incident }) => {
  const { user } = useAuth();
  const isAdminIncident = !!incident.admin_id;
  const navigate = useNavigate();

  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchLikesAndCommentsCount = async () => {
    try {
      const [likes, likedStatus, comments] = await Promise.all([
        LikeService.fetchLikesCount(incident.id),
        user ? LikeService.hasUserLiked(incident.id, user.id) : Promise.resolve(false),
        CommentService.fetchComments(incident.id),
      ]);

      setLikesCount(likes);
      setHasLiked(likedStatus);
      setCommentsCount(comments.length);
    } catch (err) {
      setError(handleError(err, 'Failed to load incident data. Please try again.'));
    }
  };

  useEffect(() => {
    fetchLikesAndCommentsCount();

    const likesChannel = supabase
      .channel(`public:likes:incident_id=eq.${incident.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `incident_id=eq.${incident.id}` }, () => {
        LikeService.fetchLikesCount(incident.id).then(setLikesCount);
        if (user) {
          LikeService.hasUserLiked(incident.id, user.id).then(setHasLiked);
        }
      })
      .subscribe();

    const commentsChannel = supabase
      .channel(`public:comments:incident_id=eq.${incident.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incident.id}` }, () => {
        CommentService.fetchComments(incident.id).then(fetchedComments => setCommentsCount(fetchedComments.length));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [incident.id, user]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      handleError(null, 'You must be logged in to like an incident.');
      return;
    }
    setIsLiking(true);

    const previousHasLiked = hasLiked;
    const previousLikesCount = likesCount;
    setHasLiked(!previousHasLiked);
    setLikesCount(prev => (previousHasLiked ? prev - 1 : prev + 1));

    try {
      let success: boolean;
      if (previousHasLiked) {
        success = await LikeService.removeLike(incident.id, user.id);
      } else {
        success = await LikeService.addLike(incident.id, user.id);
      }

      if (!success) {
        setHasLiked(previousHasLiked);
        setLikesCount(previousLikesCount);
        handleError(null, `Failed to ${previousHasLiked ? 'unlike' : 'like'} incident.`);
      }
    } catch (err) {
      setHasLiked(previousHasLiked);
      setLikesCount(previousLikesCount);
      handleError(err, 'An error occurred while liking the incident.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleIncidentClick = () => {
    navigate(`/incidents/${incident.id}`);
  };

  if (error) {
    return (
      <Card className="tw-w-full tw-bg-card tw-border tw-border-destructive tw-shadow-md tw-text-foreground tw-rounded-lg">
        <CardContent className="tw-pt-4 tw-px-4 tw-pb-4">
          <p className="tw-text-destructive">Error: {error}</p>
          <Button onClick={() => setError(null)} variant="outline" className="tw-mt-2 tw-button">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="tw-w-full tw-bg-card tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg tw-cursor-pointer" onClick={handleIncidentClick}>
      <CardHeader className="tw-pb-2 tw-px-4 tw-pt-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <p className="tw-text-sm tw-text-muted-foreground tw-font-medium tw-flex tw-items-center tw-gap-2">
            <CalendarDays className="tw-h-4 tw-w-4" /> {format(new Date(incident.date), 'MMM dd, yyyy, hh:mm a')}
          </p>
          {isAdminIncident && (
            <Badge variant="secondary" className="tw-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5">
              <Shield className="tw-h-3 tw-w-3" />
              Admin Post
            </Badge>
          )}
        </div>
        <CardTitle className="tw-xl tw-font-bold">{incident.title}</CardTitle>
      </CardHeader>
      <CardContent className="tw-pt-2 tw-px-4 tw-space-y-2">
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <MapPin className="tw-h-4 tw-w-4 tw-text-primary" />
          <span className="tw-font-medium">{incident.location}</span>
        </p>
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <Tag className="tw-h-4 tw-w-4 tw-text-secondary" />
          <span className="tw-font-medium">{incident.type}</span>
        </p>
        {incident.image_url && (
          <img
            src={incident.image_url}
            alt="Incident image"
            className="tw-w-full tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              setError(handleError(null, 'Failed to load image.'));
            }}
          />
        )}
        {incident.latitude && incident.longitude && (
          <div className="tw-w-full tw-h-64 tw-rounded-md tw-overflow-hidden tw-mb-4">
            <IncidentMap alerts={[{ // IncidentMap expects an array of alerts, so we adapt
              id: incident.id,
              title: incident.title,
              description: incident.description,
              type: incident.type,
              latitude: incident.latitude,
              longitude: incident.longitude,
              created_at: incident.created_at,
            }]} />
          </div>
        )}
        <p className="tw-flex tw-items-start tw-gap-2 tw-text-sm tw-text-muted-foreground tw-whitespace-pre-wrap">
          <FileText className="tw-h-4 tw-w-4 tw-flex-shrink-0" />
          {incident.description}
        </p>
      </CardContent>
      <CardFooter className="tw-flex tw-flex-col tw-items-start tw-pt-0 tw-pb-4 tw-px-4">
        <div className="tw-flex tw-justify-between tw-w-full tw-mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLiking || !user}
            className={hasLiked ? 'tw-text-primary hover:tw-text-primary/80 tw-button' : 'tw-text-muted-foreground hover:tw-text-primary tw-button'}
          >
            {isLiking ? <Loader2 className="tw-h-4 tw-w-4 tw-mr-1 tw-animate-spin" /> : <Heart className="tw-h-4 tw-w-4 tw-mr-1" fill={hasLiked ? 'currentColor' : 'none'} />}
            {likesCount} Like{likesCount !== 1 ? 's' : ''}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleIncidentClick}
            className="tw-text-muted-foreground hover:tw-text-primary tw-button"
          >
            <MessageCircle className="tw-h-4 tw-w-4 tw-mr-1" /> {commentsCount} Comment{commentsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

export default IncidentCard;