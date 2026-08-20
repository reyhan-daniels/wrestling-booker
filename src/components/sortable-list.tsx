"use client";

import { useId, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Drag to reorder, on a phone as well as a desktop.
 *
 * A touch drag has to be distinguished from a scroll, so the touch sensor
 * waits for a short press before it takes over — otherwise the list would
 * fight the page scroll. Mouse and keyboard need no such delay.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className = "space-y-2",
  disabled = false,
}: {
  items: T[];
  /** Called with the new id order once a drag settles. */
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, handle: React.ReactNode, index: number) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();

  // The list has to move under the finger immediately, before the server has
  // been told anything — but it must also yield once the server sends a new
  // order back. Keying the local copy against the incoming sequence does both:
  // the drag wins until the props themselves change, then the server wins.
  const incoming = items.map((item) => item.id).join(",");
  const [local, setLocal] = useState<{ key: string; items: T[] } | null>(null);
  const order = local && local.key === incoming ? local.items : items;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.findIndex((item) => item.id === active.id);
    const to = order.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;

    const next = arrayMove(order, from, to);
    setLocal({ key: incoming, items: next });
    onReorder(next.map((item) => item.id));
  }

  if (disabled) {
    return <div className={className}>{order.map((item, i) => renderItem(item, null, i))}</div>;
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={order.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {order.map((item, index) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle, index)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      // touch-none stops the browser claiming the gesture as a scroll.
      className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center self-stretch text-ink-600 hover:text-ink-300 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <svg viewBox="0 0 10 16" className="h-4 w-2.5" fill="currentColor" aria-hidden>
        <circle cx="2" cy="2" r="1.4" />
        <circle cx="8" cy="2" r="1.4" />
        <circle cx="2" cy="8" r="1.4" />
        <circle cx="8" cy="8" r="1.4" />
        <circle cx="2" cy="14" r="1.4" />
        <circle cx="8" cy="14" r="1.4" />
      </svg>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-lg shadow-black/40" : undefined}
    >
      {children(handle)}
    </div>
  );
}
