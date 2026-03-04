import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { changelog, CURRENT_VERSION } from "@/config/changelog";

const LS_KEY = "hubfrete-last-seen-version";
const JUST_UPDATED_KEY = "hubfrete-just-updated";

export function PatchNotesModal() {
  const [open, setOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const release = changelog[0]; // latest release

  // Show modal after update or if user hasn't seen this version
  useEffect(() => {
    if (!release) return;

    const justUpdated = localStorage.getItem(JUST_UPDATED_KEY);
    const lastSeen = localStorage.getItem(LS_KEY);

    if (justUpdated === "true") {
      localStorage.removeItem(JUST_UPDATED_KEY);
      setOpen(true);
    } else if (lastSeen && lastSeen !== CURRENT_VERSION) {
      // Version changed without going through our update flow
      setOpen(true);
    }
    // Don't show on first visit (no lastSeen at all) — only after updates
  }, [release]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleClose = () => {
    localStorage.setItem(LS_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  if (!release || release.slides.length === 0) return null;

  const slides = release.slides;
  const isLast = selectedIndex === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg">
            Novidades — v{release.version}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{release.date}</p>
        </DialogHeader>

        {/* Carousel */}
        <div className="relative px-6">
          <div className="overflow-hidden rounded-lg" ref={emblaRef}>
            <div className="flex">
              {slides.map((slide, i) => (
                <div
                  key={i}
                  className="flex-[0_0_100%] min-w-0"
                >
                  <div className="flex flex-col items-center text-center py-4 px-2">
                    {slide.image && (
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full max-h-48 object-contain rounded-lg mb-4"
                      />
                    )}
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      {slide.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                      {slide.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          {slides.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                disabled={selectedIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 border border-border p-1.5 text-muted-foreground transition-opacity hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={scrollNext}
                disabled={isLast}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 border border-border p-1.5 text-muted-foreground transition-opacity hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Dots + CTA */}
        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-2">
          {slides.length > 1 && (
            <div className="flex gap-1.5">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === selectedIndex
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}

          <Button onClick={isLast ? handleClose : scrollNext} className="w-full">
            {isLast ? "Entendi!" : "Próximo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
