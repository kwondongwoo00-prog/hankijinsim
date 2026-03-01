import Link from "next/link";
import { Restaurant } from "@/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const address = restaurant.road_address_name || restaurant.address_name;
  const href = `/restaurant/${encodeURIComponent(restaurant.place_name)}?address=${encodeURIComponent(address)}`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-gray-900">
        {restaurant.place_name}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{restaurant.category_name}</p>
      <p className="mt-1 text-sm text-gray-600">{address}</p>
      {restaurant.phone && (
        <p className="mt-1 text-sm text-gray-500">{restaurant.phone}</p>
      )}
    </Link>
  );
}
