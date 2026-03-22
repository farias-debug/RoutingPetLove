import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface PageSectionNavItem {
  id: string;
  label: string;
}

interface PageSectionNavProps {
  sections: PageSectionNavItem[];
}

export default function PageSectionNav({ sections }: PageSectionNavProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-24% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5],
      },
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-2xl border border-border/70 bg-background/92 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/72">
      <div className="flex min-w-max items-center gap-2">
        {sections.map((section) => (
          <Button
            key={section.id}
            type="button"
            size="sm"
            variant={activeSection === section.id ? "default" : "outline"}
            onClick={() => scrollToSection(section.id)}
            className={activeSection === section.id ? "shadow-sm" : "bg-transparent"}
          >
            {section.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
