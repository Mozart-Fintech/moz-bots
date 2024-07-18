import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  Heading,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Stack,
  Text,
  OrderedList,
  ListItem,
  HStack,
  useDisclosure,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Flex,
} from '@chakra-ui/react'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { CredentialsDropdown } from '@/features/credentials/components/CredentialsDropdown'
import { ModalProps } from '../../EmbedButton'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { WhatsAppCredentialsModal } from './WhatsAppCredentialsModal'
import { TextLink } from '@/components/TextLink'
import { PublishButton } from '../../../PublishButton'
import { useParentModal } from '@/features/graph/providers/ParentModalProvider'
import { trpc } from '@/lib/trpc'
import { SwitchWithLabel } from '@/components/inputs/SwitchWithLabel'
import { TableList } from '@/components/TableList'
import { Comparison } from '@mozbot.io/schemas'
import { DropdownList } from '@/components/DropdownList'
import { WhatsAppComparisonItem } from './WhatsAppComparisonItem'
import { AlertInfo } from '@/components/AlertInfo'
import { NumberInput } from '@/components/inputs'
import { defaultSessionExpiryTimeout } from '@mozbot.io/schemas/features/whatsapp'
import { SwitchWithRelatedSettings } from '@/components/SwitchWithRelatedSettings'
import { isDefined } from '@mozbot.io/lib/utils'
import { hasProPerks } from '@/features/billing/helpers/hasProPerks'
import { UnlockPlanAlertInfo } from '@/components/UnlockPlanAlertInfo'
import { PlanTag } from '@/features/billing/components/PlanTag'
import { LogicalOperator } from '@mozbot.io/schemas/features/blocks/logic/condition/constants'

export const WhatsAppModal = ({ isOpen, onClose }: ModalProps): JSX.Element => {
  const { mozbot, updateMozbot, isPublished } = useMozbot()
  const { ref } = useParentModal()
  const { workspace } = useWorkspace()
  const {
    isOpen: isCredentialsModalOpen,
    onOpen,
    onClose: onCredentialsModalClose,
  } = useDisclosure()

  const whatsAppSettings = mozbot?.settings.whatsApp

  const { data: phoneNumberData } =
    trpc.whatsAppInternal.getPhoneNumber.useQuery(
      {
        credentialsId: mozbot?.whatsAppCredentialsId as string,
      },
      {
        enabled: !!mozbot?.whatsAppCredentialsId,
      }
    )

  const toggleEnableWhatsApp = (isChecked: boolean) => {
    if (!phoneNumberData?.id || !mozbot) return
    updateMozbot({
      updates: {
        settings: {
          ...mozbot.settings,
          whatsApp: {
            ...mozbot.settings.whatsApp,
            isEnabled: isChecked,
          },
        },
      },
    })
  }

  const updateCredentialsId = (credentialsId: string | undefined) => {
    if (!mozbot) return
    updateMozbot({
      updates: {
        whatsAppCredentialsId: credentialsId,
      },
    })
  }

  const updateStartConditionComparisons = (comparisons: Comparison[]) => {
    if (!mozbot) return
    updateMozbot({
      updates: {
        settings: {
          ...mozbot.settings,
          whatsApp: {
            ...mozbot.settings.whatsApp,
            startCondition: {
              logicalOperator:
                mozbot.settings.whatsApp?.startCondition?.logicalOperator ??
                LogicalOperator.AND,
              comparisons,
            },
          },
        },
      },
    })
  }

  const updateStartConditionLogicalOperator = (
    logicalOperator: LogicalOperator
  ) => {
    if (!mozbot) return
    updateMozbot({
      updates: {
        settings: {
          ...mozbot.settings,
          whatsApp: {
            ...mozbot.settings.whatsApp,
            startCondition: {
              comparisons:
                mozbot.settings.whatsApp?.startCondition?.comparisons ?? [],
              logicalOperator,
            },
          },
        },
      },
    })
  }

  const updateIsStartConditionEnabled = (isEnabled: boolean) => {
    if (!mozbot) return
    updateMozbot({
      updates: {
        settings: {
          ...mozbot.settings,
          whatsApp: {
            ...mozbot.settings.whatsApp,
            startCondition: !isEnabled
              ? undefined
              : {
                  comparisons: [],
                  logicalOperator: LogicalOperator.AND,
                },
          },
        },
      },
    })
  }

  const updateSessionExpiryTimeout = (sessionExpiryTimeout?: number) => {
    if (
      !mozbot ||
      (sessionExpiryTimeout &&
        (sessionExpiryTimeout <= 0 || sessionExpiryTimeout > 48))
    )
      return
    updateMozbot({
      updates: {
        settings: {
          ...mozbot.settings,
          whatsApp: {
            ...mozbot.settings.whatsApp,
            sessionExpiryTimeout,
          },
        },
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent ref={ref}>
        <ModalHeader>
          <Heading size="md">WhatsApp</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody as={Stack} spacing="6">
          {!hasProPerks(workspace) && (
            <UnlockPlanAlertInfo excludedPlans={['STARTER']}>
              Upgrade your workspace to <PlanTag plan="PRO" /> to be able to
              enable WhatsApp integration.
            </UnlockPlanAlertInfo>
          )}
          {!isPublished && phoneNumberData?.id && (
            <AlertInfo>You have modifications that can be published.</AlertInfo>
          )}
          <OrderedList spacing={4} pl="4">
            <ListItem>
              <HStack>
                <Text>Select a phone number:</Text>
                {workspace && (
                  <>
                    <WhatsAppCredentialsModal
                      isOpen={isCredentialsModalOpen}
                      onClose={onCredentialsModalClose}
                      onNewCredentials={updateCredentialsId}
                    />
                    <CredentialsDropdown
                      type="whatsApp"
                      workspaceId={workspace.id}
                      currentCredentialsId={
                        mozbot?.whatsAppCredentialsId ?? undefined
                      }
                      onCredentialsSelect={updateCredentialsId}
                      onCreateNewClick={onOpen}
                      credentialsName="WA phone number"
                      size="sm"
                    />
                  </>
                )}
              </HStack>
            </ListItem>
            {mozbot?.whatsAppCredentialsId && (
              <>
                <ListItem>
                  <Accordion allowToggle>
                    <AccordionItem>
                      <AccordionButton justifyContent="space-between">
                        Configure integration
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel as={Stack} spacing="4" pt="4">
                        <HStack>
                          <NumberInput
                            max={48}
                            min={0}
                            width="100px"
                            label="Session expire timeout:"
                            defaultValue={
                              whatsAppSettings?.sessionExpiryTimeout
                            }
                            placeholder={defaultSessionExpiryTimeout.toString()}
                            moreInfoTooltip="A number between 0 and 48 that represents the time in hours after which the session will expire if the user does not interact with the bot. The conversation restarts if the user sends a message after that expiration time."
                            onValueChange={updateSessionExpiryTimeout}
                            withVariableButton={false}
                            suffix="hours"
                          />
                        </HStack>
                        <SwitchWithRelatedSettings
                          label={'Start bot condition'}
                          initialValue={isDefined(
                            whatsAppSettings?.startCondition
                          )}
                          onCheckChange={updateIsStartConditionEnabled}
                        >
                          <TableList<Comparison>
                            initialItems={
                              whatsAppSettings?.startCondition?.comparisons ??
                              []
                            }
                            onItemsChange={updateStartConditionComparisons}
                            ComponentBetweenItems={() => (
                              <Flex justify="center">
                                <DropdownList
                                  currentItem={
                                    whatsAppSettings?.startCondition
                                      ?.logicalOperator
                                  }
                                  onItemSelect={
                                    updateStartConditionLogicalOperator
                                  }
                                  items={Object.values(LogicalOperator)}
                                  size="sm"
                                />
                              </Flex>
                            )}
                            addLabel="Add a comparison"
                          >
                            {(props) => <WhatsAppComparisonItem {...props} />}
                          </TableList>
                        </SwitchWithRelatedSettings>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </ListItem>

                <ListItem>
                  <SwitchWithLabel
                    isDisabled={!hasProPerks(workspace)}
                    label="Enable WhatsApp integration"
                    initialValue={mozbot?.settings.whatsApp?.isEnabled ?? false}
                    onCheckChange={toggleEnableWhatsApp}
                    justifyContent="flex-start"
                  />
                </ListItem>
                <ListItem>
                  <HStack>
                    <Text>Publish your bot:</Text>
                    <PublishButton size="sm" isMoreMenuDisabled />
                  </HStack>
                </ListItem>
                {phoneNumberData?.id && (
                  <ListItem>
                    <TextLink
                      href={`https://wa.me/${phoneNumberData.name}?text=Start`}
                      isExternal
                    >
                      Try it out
                    </TextLink>
                  </ListItem>
                )}
              </>
            )}
          </OrderedList>
        </ModalBody>
        <ModalFooter />
      </ModalContent>
    </Modal>
  )
}
