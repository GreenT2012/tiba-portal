import { Customer } from '@prisma/client';
import { CustomerDto } from './customers.types';

export function toCustomerDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    name: customer.name,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  };
}
