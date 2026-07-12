export function Disclaimer() {
  return (
    <p className="border-t-2 border-foreground pt-4 text-xs font-medium leading-relaxed text-muted-foreground">
      OnLabel is a demo that checks active-ingredient duplication and dose
      ceilings against FDA labeling data. It is <strong>not medical advice</strong>{" "}
      and not a medical device. Always confirm with a pharmacist or physician
      before combining medicines.
    </p>
  );
}
