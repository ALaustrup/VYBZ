import { ProductPlaceholder } from "@/components/suite/ProductPlaceholder";
import type { SuiteProductId } from "@/design/tokens";

/** Thin Suite product page — wire via route element props. */
export function SuitePlaceholderPage({
  product,
  title,
  description,
  phaseNote,
}: {
  product: SuiteProductId;
  title: string;
  description: string;
  phaseNote?: string;
}) {
  return (
    <ProductPlaceholder
      productId={product}
      title={title}
      blurb={description}
      phaseNote={phaseNote}
    />
  );
}
