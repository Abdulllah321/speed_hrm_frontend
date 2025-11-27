import { getCountries } from "@/lib/actions/city";
import { CityAddForm } from "./city-add-form";

export default async function AddCityPage({
  searchParams,
}: {
  searchParams: Promise<{ countryId?: string }>;
}) {
  const { countryId } = await searchParams;
  const { data: countries } = await getCountries();

  return <CityAddForm countries={countries || []} defaultCountryId={countryId} />;
}

