import PageHeader from '@/components/PageHeader';
import CustomerForm from '@/components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div data-nexen-component="nx_app_customers_new_page" className="mx-auto w-full max-w-xl min-w-0 space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="New customer"
        subtitle="Add a parent and student with the monthly fee and billing day."
        backHref="/customers"
        backLabel="Back to customers"
      />
      <CustomerForm />
    </div>
  );
}