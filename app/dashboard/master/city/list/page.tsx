import { getCities, getCountries } from "@/lib/actions/city";
import { CityList } from "./city-list";

export default async function CityListPage({
  searchParams,
}: {
  searchParams: Promise<{ newItemId?: string }>;
}) {
  const { newItemId } = await searchParams;
  const [citiesRes, countriesRes] = await Promise.all([getCities(), getCountries()]);

  return (
    <CityList
      initialCities={citiesRes.data || []}
      countries={countriesRes.data || []}
      newItemId={newItemId}
    />
  );
}

