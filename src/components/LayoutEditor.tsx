import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, RotateCcw, Monitor, Tablet, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsService } from '@/services/SettingsService';
import { handleError } from '@/utils/errorHandler';
import { useIsAdmin } from '@/hooks/useIsAdmin'; // For RBAC

interface LayoutEditorProps {
  onLayoutSaved: () => void; // Callback to notify parent when layout is saved
}

interface LayoutBlock {
  id: string;
  content: string;
  color: string; // For visual distinction in the editor
}

const initialLayoutBlocks: LayoutBlock[] = [
  { id: 'header', content: 'Header Block', color: 'tw-bg-blue-500' },
  { id: 'sidebar', content: 'Sidebar Block', color: 'tw-bg-green-500' },
  { id: 'main-content', content: 'Main Content Block', color: 'tw-bg-purple-500' },
  { id: 'footer', content: 'Footer Block', color: 'tw-bg-red-500' },
];

const LayoutEditor: React.FC<LayoutEditorProps> = ({ onLayoutSaved }) => {
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [layout, setLayout] = useState<LayoutBlock[]>(initialLayoutBlocks);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const fetchLayout = async () => {
      setIsLoading(true);
      try {
        const savedLayoutString = await SettingsService.getSetting('app_layout');
        if (savedLayoutString) {
          const savedLayoutIds: string[] = JSON.parse(savedLayoutString);
          // Reconstruct layout blocks based on saved order
          const reorderedLayout = savedLayoutIds
            .map(id => initialLayoutBlocks.find(block => block.id === id))
            .filter((block): block is LayoutBlock => block !== undefined);
          setLayout(reorderedLayout);
        }
      } catch (err) {
        handleError(err, 'Failed to load saved layout.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const newLayout = Array.from(layout);
    const [reorderedItem] = newLayout.splice(result.source.index, 1);
    newLayout.splice(result.destination.index, 0, reorderedItem);

    setLayout(newLayout);
  };

  const handleSaveLayout = async () => {
    if (!isAdmin) {
      toast.error('You do not have permission to save layouts.');
      return;
    }
    setIsSaving(true);
    toast.loading('Saving layout...', { id: 'save-layout' });
    try {
      const layoutIds = layout.map(block => block.id);
      const success = await SettingsService.updateSetting('app_layout', JSON.stringify(layoutIds));
      if (success) {
        toast.success('Layout saved successfully!', { id: 'save-layout' });
        onLayoutSaved(); // Notify parent
      } else {
        handleError(null, 'Failed to save layout.', { id: 'save-layout' });
      }
    } catch (err) {
      handleError(err, 'An unexpected error occurred while saving layout.', { id: 'save-layout' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLayout = () => {
    if (window.confirm('Are you sure you want to reset the layout to default?')) {
      setLayout(initialLayoutBlocks);
      toast.info('Layout reset to default. Remember to save changes!');
    }
  };

  const getPreviewClasses = () => {
    switch (previewMode) {
      case 'tablet':
        return 'tw-w-[768px] tw-h-[1024px] md:tw-w-[768px] md:tw-h-[1024px]';
      case 'mobile':
        return 'tw-w-[375px] tw-h-[667px] md:tw-w-[375px] md:tw-h-[667px]';
      case 'desktop':
      default:
        return 'tw-w-full tw-h-[800px]';
    }
  };

  if (isAdminLoading || isLoading) {
    return (
      <div className="tw-flex tw-justify-center tw-items-center tw-py-8">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2 tw-text-muted-foreground">Loading layout editor...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="tw-text-center tw-py-8 tw-text-destructive">
        You do not have permission to access the layout editor.
      </div>
    );
  }

  return (
    <div className="tw-space-y-6">
      <Card className="tw-bg-card tw-border-border tw-shadow-lg">
        <CardHeader>
          <CardTitle className="tw-text-xl tw-font-bold tw-text-foreground">Layout Editor</CardTitle>
          <CardDescription className="tw-text-muted-foreground">
            Drag and drop blocks to customize the conceptual layout of your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="tw-flex tw-flex-col lg:tw-flex-row tw-gap-6">
          <div className="tw-flex-1 tw-space-y-4">
            <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">Draggable Blocks</h3>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="layout-blocks">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="tw-space-y-3 tw-p-4 tw-border tw-border-dashed tw-rounded-lg tw-bg-muted/20"
                  >
                    {layout.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`tw-p-4 tw-rounded-md tw-text-white tw-font-medium tw-shadow-md ${block.color} tw-cursor-grab active:tw-cursor-grabbing`}
                          >
                            {block.content}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <div className="tw-flex tw-gap-2 tw-mt-4">
              <Button onClick={handleSaveLayout} disabled={isSaving} className="tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground">
                {isSaving && <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />}
                <Save className="tw-mr-2 tw-h-4 tw-w-4" /> Save Layout
              </Button>
              <Button variant="outline" onClick={handleResetLayout} disabled={isSaving}>
                <RotateCcw className="tw-mr-2 tw-h-4 tw-w-4" /> Reset to Default
              </Button>
            </div>
          </div>

          <div className="tw-flex-1 tw-space-y-4">
            <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">Live Preview</h3>
            <div className="tw-flex tw-justify-center tw-gap-2 tw-mb-4">
              <Button variant={previewMode === 'desktop' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewMode('desktop')} aria-label="Desktop preview">
                <Monitor className="tw-h-4 tw-w-4" />
              </Button>
              <Button variant={previewMode === 'tablet' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewMode('tablet')} aria-label="Tablet preview">
                <Tablet className="tw-h-4 tw-w-4" />
              </Button>
              <Button variant={previewMode === 'mobile' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewMode('mobile')} aria-label="Mobile preview">
                <Smartphone className="tw-h-4 tw-w-4" />
              </Button>
            </div>
            <div className={`tw-relative tw-border-2 tw-border-border tw-rounded-lg tw-overflow-hidden tw-shadow-xl tw-mx-auto tw-transition-all tw-duration-300 ${getPreviewClasses()} tw-bg-background`}>
              <div className="tw-absolute tw-inset-0 tw-p-2 tw-space-y-2 tw-overflow-y-auto">
                {layout.map(block => (
                  <div key={block.id} className={`tw-p-3 tw-rounded-md tw-text-white tw-text-sm tw-font-medium ${block.color} tw-opacity-80`}>
                    {block.content}
                  </div>
                ))}
              </div>
            </div>
            <p className="tw-text-sm tw-text-muted-foreground tw-text-center tw-mt-2">
              This is a conceptual preview. Actual application rendering may vary.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayoutEditor;