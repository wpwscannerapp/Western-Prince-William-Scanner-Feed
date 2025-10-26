"use client";

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Monitor, Tablet, Smartphone } from 'lucide-react';
import { AnalyticsService } from '@/services/AnalyticsService'; // Import AnalyticsService

export interface LayoutComponent {
  id: string;
  type: string;
  content: string;
}

interface LayoutEditorProps {
  layout: LayoutComponent[];
  onLayoutChange: (newLayout: LayoutComponent[]) => void;
}

const sampleComponents: LayoutComponent[] = [
  { id: 'header', type: 'Header', content: 'App Header with Logo' },
  { id: 'sidebar', type: 'Sidebar', content: 'Navigation Menu' },
  { id: 'analytics-card', type: 'Card', content: 'Analytics Overview' },
  { id: 'posts-table', type: 'Table', content: 'Posts Management' },
  { id: 'footer', type: 'Footer', content: 'App Footer' },
];

const LayoutEditor: React.FC<LayoutEditorProps> = ({ layout = [], onLayoutChange }) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const handleDragEnd = useCallback(
    (result: import('react-beautiful-dnd').DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) {
        AnalyticsService.trackEvent({ name: 'layout_editor_drag_ended_outside', properties: { draggableId } });
        return;
      }

      if (source.droppableId === 'component-palette' && destination.droppableId === 'layout-board') {
        const componentToAdd = sampleComponents.find(comp => `palette-${comp.id}` === draggableId);
        if (componentToAdd) {
          const newLayout = Array.from(layout);
          newLayout.splice(destination.index, 0, componentToAdd);
          onLayoutChange(newLayout);
          AnalyticsService.trackEvent({ name: 'layout_editor_component_added', properties: { componentId: componentToAdd.id, index: destination.index } });
        }
      } 
      else if (source.droppableId === 'layout-board' && destination.droppableId === 'layout-board') {
        const newLayout = Array.from(layout);
        const [reorderedItem] = newLayout.splice(source.index, 1);
        newLayout.splice(destination.index, 0, reorderedItem);
        onLayoutChange(newLayout);
        AnalyticsService.trackEvent({ name: 'layout_editor_component_reordered', properties: { componentId: reorderedItem.id, fromIndex: source.index, toIndex: destination.index } });
      }
      else if (source.droppableId === 'layout-board' && destination.droppableId === 'component-palette') {
        const newLayout = Array.from(layout);
        const [removedItem] = newLayout.splice(source.index, 1);
        onLayoutChange(newLayout);
        AnalyticsService.trackEvent({ name: 'layout_editor_component_removed', properties: { componentId: removedItem.id, fromIndex: source.index } });
      }
    },
    [layout, onLayoutChange]
  );

  const DraggableComponent = ({
    component,
    index,
  }: {
    component: LayoutComponent;
    index: number;
  }) => (
    <Draggable draggableId={component.id} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
        const { onTransitionEnd, ...draggablePropsWithoutTransitionEnd } = provided.draggableProps;
        return (
          <div
            ref={provided.innerRef}
            {...draggablePropsWithoutTransitionEnd}
            style={provided.draggableProps.style}
            className={`tw-p-4 tw-mb-2 tw-bg-card tw-border tw-rounded-lg tw-shadow-sm ${
              snapshot.isDragging ? 'tw-shadow-lg tw-scale-105' : ''
            }`}
            aria-roledescription="Draggable layout component"
            aria-grabbed={snapshot.isDragging}
          >
            <div className="tw-flex tw-items-center tw-justify-between">
              <div {...provided.dragHandleProps} className="tw-h-5 tw-w-5 tw-text-muted-foreground tw-cursor-grab" aria-label="Drag handle">
                <GripVertical aria-hidden="true" />
              </div>
              <span className="tw-font-medium">{component.content}</span>
              <div className="tw-text-xs tw-text-muted-foreground">({component.type})</div>
            </div>
          </div>
        );
      }}
    </Draggable>
  );

  const getPreviewClasses = () => {
    switch (previewDevice) {
      case 'tablet':
        return 'tw-w-[768px] tw-h-[1024px]';
      case 'mobile':
        return 'tw-w-[375px] tw-h-[667px]';
      case 'desktop':
      default:
        return 'tw-w-full tw-h-[800px]';
    }
  };

  return (
    <div className="tw-space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="tw-flex tw-flex-col lg:tw-flex-row tw-gap-6">
          <div className="tw-flex-1 tw-space-y-4">
            <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">Available Components</h3>
            <Droppable droppableId="component-palette" isDropDisabled={false}>
              {(provided: import('react-beautiful-dnd').DroppableProvided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="tw-flex tw-flex-wrap tw-gap-2 tw-p-4 tw-border tw-rounded-lg tw-bg-gray-100 tw-bg-opacity-20 tw-min-h-[100px]" aria-label="Component palette">
                  {sampleComponents.map((comp, index) => (
                    <Draggable key={`palette-${comp.id}`} draggableId={`palette-${comp.id}`} index={index}>
                      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
                        const { onTransitionEnd, ...draggablePropsWithoutTransitionEnd } = provided.draggableProps;
                        return (
                          <Card
                            ref={provided.innerRef}
                            {...draggablePropsWithoutTransitionEnd}
                            style={provided.draggableProps.style}
                            className="tw-flex-0 tw-w-32 tw-cursor-grab tw-text-center tw-p-2 tw-shadow-sm hover:tw-shadow-md"
                            aria-roledescription="Draggable component from palette"
                            aria-grabbed={snapshot.isDragging}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="tw-mx-auto tw-mb-1 tw-h-4 tw-w-4 tw-cursor-grab"
                              aria-label="Drag handle"
                            >
                              <GripVertical aria-hidden="true" />
                            </div>
                            <p className="tw-text-xs">{comp.type}</p>
                          </Card>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <p className="tw-text-sm tw-text-muted-foreground">Drag components from here to the layout board.</p>
          </div>

          <div className="tw-flex-1 tw-space-y-4">
            <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">Layout Board</h3>
            <Droppable droppableId="layout-board">
              {(provided: import('react-beautiful-dnd').DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`tw-min-h-[200px] tw-p-4 tw-border-2 tw-border-dashed tw-rounded-lg tw-bg-gray-100 tw-bg-opacity-50`}
                  aria-label="Layout board"
                >
                  {layout.length > 0 ? (
                    layout.map((component, index) => (
                      <DraggableComponent key={component.id} component={component} index={index} />
                    ))
                  ) : (
                    <p className="tw-text-muted-foreground tw-text-center tw-py-8">Drag components here to build your layout</p>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <p className="tw-text-sm tw-text-muted-foreground">Reorder components or drag them back to the palette to remove.</p>
          </div>
        </div>
      </DragDropContext>

      <div className="tw-space-y-4 tw-mt-6">
        <h3 className="tw-text-lg tw-font-semibold tw-text-foreground">Live Preview</h3>
        <div className="tw-flex tw-justify-center tw-gap-2 tw-mb-4" role="group" aria-label="Preview device selection">
          <Button variant={previewDevice === 'desktop' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewDevice('desktop')} aria-label="Desktop preview">
            <Monitor className="tw-h-4 tw-w-4" aria-hidden="true" />
          </Button>
          <Button variant={previewDevice === 'tablet' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewDevice('tablet')} aria-label="Tablet preview">
            <Tablet className="tw-h-4 tw-w-4" aria-hidden="true" />
          </Button>
          <Button variant={previewDevice === 'mobile' ? 'secondary' : 'outline'} size="icon" onClick={() => setPreviewDevice('mobile')} aria-label="Mobile preview">
            <Smartphone className="tw-h-4 tw-w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className={`tw-relative tw-border-2 tw-border-border tw-rounded-lg tw-overflow-hidden tw-shadow-xl tw-mx-auto tw-transition-all tw-duration-300 ${getPreviewClasses()} tw-bg-background`} aria-label={`Live preview on ${previewDevice}`}>
          <div className="tw-absolute tw-inset-0 tw-p-2 tw-space-y-2 tw-overflow-y-auto">
            {layout.length > 0 ? (
              layout.map(block => (
                <div key={block.id} className={`tw-p-3 tw-rounded-md tw-text-white tw-text-sm tw-font-medium tw-bg-primary tw-opacity-80`}>
                  {block.content}
                </div>
              ))
            ) : (
              <p className="tw-text-muted-foreground tw-text-center tw-py-8">No components in layout. Drag from palette.</p>
            )}
          </div>
        </div>
        <p className="tw-text-sm tw-text-muted-foreground tw-text-center tw-mt-2">
          This is a conceptual preview. Actual application rendering may vary.
        </p>
      </div>
    </div>
  );
};

export default LayoutEditor;