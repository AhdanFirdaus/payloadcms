import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',

  admin: {
    useAsTitle: 'email',
  },

  auth: true,

  access: {
    create: () => true,

    read: ({ req }) => {
      // admin bisa lihat semua
      if (req.user?.collection === 'users') {
        return true
      }

      // customer hanya bisa lihat dirinya sendiri
      return {
        id: {
          equals: req.user?.id,
        },
      }
    },

    update: ({ req }) => {
      // admin
      if (req.user?.collection === 'users') {
        return true
      }

      // customer update profile sendiri
      return {
        id: {
          equals: req.user?.id,
        },
      }
    },

    delete: ({ req }) => {
      // hanya admin
      return req.user?.collection === 'users'
    },
  },

  hooks: {
    afterDelete: [
      async ({ id, req }) => {
        try {
          await req.payload.delete({
            collection: 'participation',

            where: {
              customer: {
                equals: id,
              },
            },

            overrideAccess: true,
          })
        } catch (error) {
          console.error(
            'Failed to delete participation:',
            error,
          )
        }
      },
    ],
  },

  fields: [
    {
      name: 'isActive',

      label: 'Active Account',

      type: 'checkbox',

      defaultValue: true,

      admin: {
        description:
          'Disable account without deleting payment history',
      },
    },
  ],
}