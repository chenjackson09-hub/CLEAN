import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/context/LangContext";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import ListingChecklist from "./ListingChecklist";

const wrap = (ui: React.ReactElement) => render(<LanguageProvider><LangProvider>{ui}</LangProvider></LanguageProvider>);

describe("ListingChecklist", () => {
  it("lists what is still missing, linking the profile items", () => {
    wrap(<ListingChecklist checklist={{ photo: false, rate: true, days: false, listed: false }} />);
    expect(screen.getByText("To be shown to hosts, add:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A profile photo" })).toHaveAttribute("href", "/cleaner/profile?edit=1");
    expect(screen.getByText("An hourly rate")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "An hourly rate" })).not.toBeInTheDocument();
  });
  it("disappears once the cleaner is listed", () => {
    wrap(<ListingChecklist checklist={{ photo: true, rate: true, days: true, listed: true }} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
