"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarDays, MapPin, Tag, FileText, Heart, MessageCircle, Loader2, Shield } from 'lucide-react';
import { IncidentRow } from '@/types/supabase'; // Import IncidentRow
import { LikeService } from '@/services/LikeService';
import { CommentService } from '@/services/CommentService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsService } from '@/services/AnalyticsService';
import { useIsAdmin } from '@/hooks/useIsAdmin'; // Import useIsAdmin
import IncidentActions from './IncidentActions'; // Import IncidentActions
import { IncidentService } from '@/services/IncidentService'; // Import IncidentService for getStaticMapUrl

interface IncidentCardProps {
  incident: IncidentRow; // Use IncidentRow
  // Optional prop to trigger a refresh in the parent component (used by archive/feed)
  onActionComplete?: () => void; 
}

const IncidentCard: React.FC<IncidentCardProps> = React.memo(({ incident, onActionComplete }) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(); // Use useIsAdmin hook
  const isAdminIncident = !!incident.admin_id;
  const navigate = useNavigate();

  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchLikesAndCommentsCount = async () => {
    try {
      const [likes, likedStatus, commentsCount] = await Promise.all([
        LikeService.fetchLikesCount(incident.id),
        user ? LikeService.hasUserLiked(incident.id, user.id) : Promise.resolve(false),
        CommentService.fetchCommentsCount(incident.id), // Use the optimized count function
      ]);

      setLikesCount(likes);
      setHasLiked(likedStatus);
      setCommentsCount(commentsCount);
      AnalyticsService.trackEvent({ name: 'incident_card_data_loaded', properties: { incidentId: incident.id, likes: likes, comments: commentsCount } });
    } catch (err) {
      setError(handleError(err, 'Failed to load incident data. Please try again.'));
      AnalyticsService.trackEvent({ name: 'incident_card_data_load_failed', properties: { incidentId: incident.id, error: (err as Error).message } });
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
        AnalyticsService.trackEvent({ name: 'incident_likes_realtime_update', properties: { incidentId: incident.id } });
      })
      .subscribe();

    const commentsChannel = supabase
      .channel(`public:comments:incident_id=eq.${incident.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${incident.id}` }, () => {
        CommentService.fetchCommentsCount(incident.id).then(setCommentsCount); // Use the optimized count function
        AnalyticsService.trackEvent({ name: 'incident_comments_realtime_update', properties: { incidentId: incident.id } });
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
      AnalyticsService.trackEvent({ name: 'like_toggle_failed', properties: { incidentId: incident.id, reason: 'not_logged_in' } });
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
        AnalyticsService.trackEvent({ name: 'like_toggle_failed', properties: { incidentId: incident.id, userId: user.id, action: previousHasLiked ? 'unlike' : 'like', reason: 'db_operation_failed' } });
      }
    } catch (err) {
      setHasLiked(previousHasLiked);
      setLikesCount(previousLikesCount);
      handleError(err, 'An error occurred while liking the incident.');
      AnalyticsService.trackEvent({ name: 'like_toggle_failed', properties: { incidentId: incident.id, userId: user.id, action: previousHasLiked ? 'unlike' : 'like', reason: 'unexpected_error', error: (err as Error).message } });
    } finally {
      setIsLiking(false);
    }
  };

  const handleIncidentClick = () => {
    navigate(`/incidents/${incident.id}`);
    AnalyticsService.trackEvent({ name: 'incident_card_clicked', properties: { incidentId: incident.id } });
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

  // Determine the image source: use the direct Supabase URL if available.
  const imageUrl = incident.image_url && incident.image_url.trim() !== '' ? incident.image_url : undefined;
  const cdnImageUrl = imageUrl; 

  // Determine the static map URL
  const staticMapUrl = (incident.latitude && incident.longitude) 
    ? IncidentService.getStaticMapUrl(incident.latitude, incident.longitude, incident.type) 
    : undefined;

  return (
    <Card className="tw-w-full tw-bg-card tw-border-border tw-shadow-md tw-text-foreground tw-rounded-lg tw-cursor-pointer" onClick={handleIncidentClick}>
      <CardHeader className="tw-pb-2 tw-px-4 tw-pt-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <p className="tw-text-sm tw-text-muted-foreground tw-font-medium tw-flex tw-items-center tw-gap-2">
            <CalendarDays className="tw-h-4 tw-w-4" aria-hidden="true" /> {format(new Date(incident.date!), 'MMM dd, yyyy, hh:mm a')}
          </p>
          {isAdminIncident && (
            <Badge variant="secondary" className="tw-flex tw-items-center tw-gap-1 tw-px-2 tw-py-0.5">
              <Shield className="tw-h-3 tw-w-3" aria-hidden="true" />
              Admin Post
            </Badge>
          )}
        </div>
        <CardTitle className="tw-xl tw-font-bold">{incident.title}</CardTitle>
      </CardHeader>
      <CardContent className="tw-pt-2 tw-px-4 tw-space-y-2">
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <MapPin className="tw-h-4 tw-w-4 tw-text-primary" aria-hidden="true" />
          <span className="tw-font-medium">{incident.location}</span>
        </p>
        <p className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <Tag className="tw-h-4 tw-w-4 tw-text-secondary" aria-hidden="true" />
          <span className="tw-font-medium">{incident.type}</span>
        </p>
        
        <p className="tw-flex tw-items-start tw-gap-2 tw-text-sm tw-text-foreground tw-whitespace-pre-wrap">
          <FileText className="tw-h-4 tw-w-4 tw-flex-shrink-0 tw-text-muted-foreground" aria-hidden="true" />
          {incident.description}
        </p>

        {/* Incident Image (if available) - Moved below description */}
        {cdnImageUrl && (
          <img
            src={cdnImageUrl} 
            alt={`Image for incident: ${incident.title}`}
            className="tw-w-full tw-h-auto tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              setError(handleError(null, 'Failed to load image.'));
              AnalyticsService.trackEvent({ name: 'incident_image_load_failed', properties: { incidentId: incident.id, imageUrl: incident.image_url } });
            }}
          />
        )}
        
        {/* Static Map Image - Moved below image/description */}
        {staticMapUrl && (
          <img
            src={staticMapUrl}
            alt={`Map of incident location: ${incident.location}`}
            className="tw-w-full tw-h-auto tw-max-h-80 tw-object-cover tw-rounded-md tw-mb-4 tw-border tw-border-border"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              AnalyticsService.trackEvent({ name: 'static_map_load_failed', properties: { incidentId: incident.id, mapUrl: staticMapUrl } });
            }}
          />
        )}
      </CardContent>
      <CardFooter className="tw-flex tw-flex-col tw-items-start tw-pt-0 tw-pb-4 tw-px-4">
        <div className="tw-flex tw-justify-between tw-w-full tw-mb-2">
          <div className="tw-flex tw-gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeToggle}
              disabled={isLiking || !user}
              className={hasLiked ? 'tw-text-primary hover:tw-text-primary/80 tw-button' : 'tw-text-muted-foreground hover:tw-text-primary tw-button'}
              aria-label={hasLiked ? `Unlike incident, currently ${likesCount} likes` : `Like incident, currently ${likesCount} likes`}
            >
              {isLiking ? <Loader2 className="tw-h-4 tw-w-4 tw-mr-1 tw-animate-spin" aria-hidden="true" /> : <Heart className="tw-h-4 tw-w-4 tw-mr-1" fill={hasLiked ? 'currentColor' : 'none'} aria-hidden="true" />}
              {likesCount} Like{likesCount !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIncidentClick}
              className="tw-text-muted-foreground hover:tw-text-primary tw-button"
              aria-label={`View comments for incident, currently ${commentsCount} comments`}
            >
              <MessageCircle className="tw-h-4 tw-w-4 tw-mr-1" aria-hidden="true" /> {commentsCount} Comment{commentsCount !== 1 ? 's' : ''}
            </Button>
          </div>
          
          {/* Admin Actions */}
          {isAdmin && (
            <IncidentActions incident={incident} onActionComplete={onActionComplete || (() => {})} />
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

export default IncidentCard;