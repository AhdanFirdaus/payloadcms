import type { CollectionConfig } from 'payload'

export const Participation: CollectionConfig = {
  slug: 'participation',

  admin: {
    useAsTitle: 'stripeSessionID',
  },

  access: {
    read: ({ req }) => {
      if (!req.user) {
        return false
      }

      // admin bisa lihat semua
      if (req.user.collection === 'users') {
        return true
      }

      // customer hanya lihat miliknya
      return {
        customer: {
          equals: req.user.id,
        },
      }
    },

    create: () => false,
    update: () => false,
    delete: () => false,
  },

  fields: [
    {
      name: 'customer',
      label: 'Customer',

      type: 'relationship',

      relationTo: 'customers',

      required: true,
    },

    {
      name: 'course',
      label: 'Course',

      type: 'relationship',

      relationTo: 'courses',

      required: true,
    },

    {
      name: 'progress',
      label: 'Progress',

      type: 'number',

      defaultValue: 0,

      min: 0,

      max: 100,
    },

    // =========================
    // PAYMENT DATA
    // =========================

    {
      name: 'paymentStatus',

      label: 'Payment Status',

      type: 'select',

      required: true,

      defaultValue: 'paid',

      options: [
        {
          label: 'Paid',
          value: 'paid',
        },
      ],
    },

    {
      name: 'stripeSessionID',

      label: 'Stripe Session ID',

      type: 'text',

      required: true,

      unique: true,
    },

    {
      name: 'stripePaymentIntentID',

      label: 'Stripe Payment Intent ID',

      type: 'text',
    },

    {
      name: 'purchasedAt',

      label: 'Purchased At',

      type: 'date',

      defaultValue: () => new Date(),
    },
  ],

  indexes: [
    {
      fields: ['customer', 'course'],
      unique: true,
    },
  ],
}