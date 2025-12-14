import React, { useEffect, useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    CircularProgress,
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Alert,
    IconButton,
    Tooltip,
    Collapse,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControlLabel,
    Checkbox,
    Autocomplete,
} from '@mui/material';
import {
    Search as SearchIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePostalCode, PostalCodeResult } from '../hooks/usePostalCode';
import { useAddressToPostalCode, validatePostalCodeAddress, AddressSearchResult } from '../hooks/useAddressToPostalCode';
import { useAllMasters, useMaster } from '../hooks/useMasters';

// Extended customer schema matching GENIEE CRM CSV (52 columns)
const customerSchema = z.object({
    // 識別情報
    trackingNo: z.string().optional(),
    parentChildFlag: z.string().optional(),
    branch: z.string().optional(),

    // 基本情報
    name: z.string().min(1, '名前は必須です'),
    nameKana: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', '男', '女', '']).optional(),
    age: z.string().optional(),

    // 住所
    postalCode: z.string().regex(/^\d{3,7}-?\d{0,4}$/, '郵便番号の形式が正しくありません').optional().or(z.literal('')),
    prefecture: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    streetNumber: z.string().optional(),
    building: z.string().optional(),

    // 連絡先
    phone: z.string().optional(),
    phone2: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().email('メールアドレスの形式が正しくありません').optional().or(z.literal('')),

    // CRM管理情報
    memo: z.string().optional(),
    notes: z.string().optional(),
    visitRoute: z.string().optional(),
    otherCompanyReferralDate: z.string().optional(),
    receptionist: z.string().optional(),
    doNotContact: z.boolean().optional(),
    crossSellTarget: z.boolean().optional(),

    // 典礼責任者
    memorialContactName: z.string().optional(),
    memorialContactRelationship: z.string().optional(),
    memorialContactPostalCode: z.string().optional(),
    memorialContactAddress: z.string().optional(),
    memorialContactPhone: z.string().optional(),
    memorialContactMobile: z.string().optional(),
    memorialContactEmail: z.string().email('メールアドレスの形式が正しくありません').optional().or(z.literal('')),

    // 使用者変更
    userHasChanged: z.boolean().optional(),
    userChangeReason: z.string().optional(),
    previousUserName: z.string().optional(),
    relationshipToNewUser: z.string().optional(),

    // ニーズ・嗜好
    transportation: z.string().optional(),
    searchReason: z.string().optional(),
    familyStructure: z.string().optional(),
    religiousSect: z.string().optional(),
    preferredPlan: z.string().optional(),
    burialPlannedCount: z.string().optional(),
    purchaseTiming: z.string().optional(),
    appealPoints: z.string().optional(),
    appealPointsOther: z.string().optional(),
    concerns: z.string().optional(),
    otherConsultation: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CustomerFormData) => Promise<void>;
    initialData?: Partial<CustomerFormData>;
    mode: 'create' | 'edit';
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
    open,
    onClose,
    onSubmit,
    initialData,
    mode,
}) => {
    // マスターデータを取得
    const { getOptions, loading: mastersLoading } = useAllMasters();
    const { master: employeesMaster, loading: employeesLoading } = useMaster('employees');

    // 従業員マスター（フリガナ昇順）
    const activeEmployees = React.useMemo(() => {
        if (!employeesMaster?.items) return [];
        return employeesMaster.items
            .filter(item => item.isActive)
            .sort((a, b) => (a.furigana || '').localeCompare(b.furigana || '', 'ja'));
    }, [employeesMaster]);

    // マスターオプション
    const branchOptions = getOptions('branches');
    const visitRouteOptions = getOptions('visitRoutes');
    const planOptions = getOptions('plans');
    const religiousSectOptions = getOptions('religiousSects');
    const transportationOptions = getOptions('transportations');
    const relationshipOptions = getOptions('relationships');

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            doNotContact: false,
            crossSellTarget: false,
            userHasChanged: false,
            ...initialData,
        },
    });

    // ダイアログが開いたときに初期データをリセット
    useEffect(() => {
        if (open && initialData) {
            reset({
                doNotContact: false,
                crossSellTarget: false,
                userHasChanged: false,
                ...initialData,
            });
        }
    }, [open, initialData, reset]);

    const postalCode = watch('postalCode');
    const prefecture = watch('prefecture');
    const city = watch('city');
    const town = watch('town');

    // Accordion expansion state
    const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'address', 'contact']);

    const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedSections(prev =>
            isExpanded ? [...prev, panel] : prev.filter(p => p !== panel)
        );
    };

    // Postal code to address lookup
    const {
        data: addressData,
        results: addressResults,
        loading: addressLoading,
        hasMultipleResults,
        selectResult,
    } = usePostalCode(postalCode || '');

    // Address to postal code lookup
    const {
        results: postalCodeResults,
        loading: postalCodeLoading,
        error: postalCodeError,
        search: searchPostalCode,
        clear: clearPostalCodeResults,
    } = useAddressToPostalCode();

    const [showAddressSelector, setShowAddressSelector] = useState(false);
    const [showPostalCodeSelector, setShowPostalCodeSelector] = useState(false);
    const [validationStatus, setValidationStatus] = useState<{
        isValid: boolean;
        message?: string;
        suggestions?: AddressSearchResult[];
    } | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    // Show address selector when multiple results are available
    useEffect(() => {
        if (hasMultipleResults) {
            setShowAddressSelector(true);
        } else {
            setShowAddressSelector(false);
        }
    }, [hasMultipleResults]);

    // Auto-fill address when single result or user selected
    useEffect(() => {
        if (addressData) {
            setValue('prefecture', addressData.prefecture);
            setValue('city', addressData.city);
            setValue('town', addressData.town);
            setShowAddressSelector(false);
            setValidationStatus({ isValid: true });
        }
    }, [addressData, setValue]);

    // Validate postal code and address consistency when values change
    const validateConsistency = useCallback(async () => {
        if (!postalCode || postalCode.replace(/[^0-9]/g, '').length !== 7) {
            setValidationStatus(null);
            return;
        }
        if (!prefecture && !city) {
            setValidationStatus(null);
            return;
        }

        setIsValidating(true);
        const result = await validatePostalCodeAddress(postalCode, prefecture || '', city || '', town);
        setValidationStatus(result);
        setIsValidating(false);
    }, [postalCode, prefecture, city, town]);

    // Debounced validation
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            validateConsistency();
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [validateConsistency]);

    const handleAddressSelect = (result: PostalCodeResult, index: number) => {
        selectResult(index);
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setShowAddressSelector(false);
        setValidationStatus({ isValid: true });
    };

    const handleSearchPostalCode = async () => {
        if (!prefecture || !city) {
            return;
        }
        await searchPostalCode(prefecture, city, town);
        setShowPostalCodeSelector(true);
    };

    const handlePostalCodeSelect = (result: AddressSearchResult) => {
        setValue('postalCode', result.postalCode);
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setShowPostalCodeSelector(false);
        clearPostalCodeResults();
        setValidationStatus({ isValid: true });
    };

    const handleSuggestionSelect = (result: AddressSearchResult) => {
        setValue('prefecture', result.prefecture);
        setValue('city', result.city);
        setValue('town', result.town);
        setValidationStatus({ isValid: true });
    };

    const handleFormSubmit = async (data: CustomerFormData) => {
        await onSubmit(data);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {mode === 'create' ? '新規顧客登録' : '顧客情報編集'}
            </DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ mt: 2 }}>
                    {/* 基本情報 */}
                    <Accordion
                        expanded={expandedSections.includes('basic')}
                        onChange={handleAccordionChange('basic')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">基本情報</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="使用者名"
                                                fullWidth
                                                required
                                                error={!!errors.name}
                                                helperText={errors.name?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="nameKana"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="フリガナ"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="gender"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                select
                                                label="性別"
                                                fullWidth
                                            >
                                                <MenuItem value="">未設定</MenuItem>
                                                <MenuItem value="男">男性</MenuItem>
                                                <MenuItem value="女">女性</MenuItem>
                                                <MenuItem value="other">その他</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="age"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="年齢"
                                                fullWidth
                                                type="number"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="branch"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={branchOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="拠点" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="trackingNo"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="追客NO"
                                                fullWidth
                                                disabled={mode === 'edit'}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="parentChildFlag"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="親子フラグ"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* 住所 */}
                    <Accordion
                        expanded={expandedSections.includes('address')}
                        onChange={handleAccordionChange('address')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">住所</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="postalCode"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="郵便番号"
                                                fullWidth
                                                placeholder="123-4567"
                                                error={!!errors.postalCode}
                                                helperText={errors.postalCode?.message || (hasMultipleResults ? '複数の住所が見つかりました。下から選択してください。' : '')}
                                                InputProps={{
                                                    endAdornment: (
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            {addressLoading && <CircularProgress size={20} />}
                                                            {isValidating && <CircularProgress size={20} />}
                                                            {!addressLoading && !isValidating && validationStatus && (
                                                                validationStatus.isValid ? (
                                                                    <CheckCircleIcon color="success" fontSize="small" />
                                                                ) : (
                                                                    <Tooltip title={validationStatus.message}>
                                                                        <WarningIcon color="warning" fontSize="small" />
                                                                    </Tooltip>
                                                                )
                                                            )}
                                                        </Box>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>

                                {/* Validation Warning */}
                                <Collapse in={validationStatus !== null && !validationStatus.isValid} sx={{ width: '100%' }}>
                                    <Grid item xs={12}>
                                        <Alert
                                            severity="warning"
                                            sx={{ mt: 1, mx: 2 }}
                                            action={
                                                validationStatus?.suggestions && validationStatus.suggestions.length > 0 && (
                                                    <Button
                                                        color="inherit"
                                                        size="small"
                                                        onClick={() => {
                                                            if (validationStatus.suggestions && validationStatus.suggestions.length > 0) {
                                                                handleSuggestionSelect(validationStatus.suggestions[0]);
                                                            }
                                                        }}
                                                    >
                                                        修正する
                                                    </Button>
                                                )
                                            }
                                        >
                                            {validationStatus?.message}
                                            {validationStatus?.suggestions && validationStatus.suggestions.length > 0 && (
                                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                    正しい住所: {validationStatus.suggestions[0].prefecture} {validationStatus.suggestions[0].city} {validationStatus.suggestions[0].town}
                                                </Typography>
                                            )}
                                        </Alert>
                                    </Grid>
                                </Collapse>

                                {/* Address Selection List (from postal code) */}
                                {showAddressSelector && addressResults.length > 1 && (
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ mt: 1, mb: 2 }}>
                                            <Alert severity="info" sx={{ borderRadius: 0 }}>
                                                この郵便番号には{addressResults.length}件の住所が該当します。選択してください。
                                            </Alert>
                                            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                {addressResults.map((result, index) => (
                                                    <ListItemButton
                                                        key={index}
                                                        onClick={() => handleAddressSelect(result, index)}
                                                        sx={{
                                                            '&:hover': {
                                                                backgroundColor: 'primary.light',
                                                                color: 'primary.contrastText',
                                                            }
                                                        }}
                                                    >
                                                        <ListItemText
                                                            primary={`${result.prefecture} ${result.city} ${result.town}`}
                                                            primaryTypographyProps={{
                                                                variant: 'body2',
                                                            }}
                                                        />
                                                    </ListItemButton>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="prefecture"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="都道府県" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="city"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="市区町村" fullWidth />
                                        )}
                                    />
                                </Grid>

                                {/* Postal Code Search Results (from address) */}
                                {showPostalCodeSelector && postalCodeResults.length > 0 && (
                                    <Grid item xs={12}>
                                        <Paper variant="outlined" sx={{ mt: 1, mb: 2 }}>
                                            <Alert severity="info" sx={{ borderRadius: 0 }}>
                                                {postalCodeResults.length}件の郵便番号が見つかりました。選択してください。
                                            </Alert>
                                            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                {postalCodeResults.map((result, index) => (
                                                    <ListItemButton
                                                        key={index}
                                                        onClick={() => handlePostalCodeSelect(result)}
                                                    >
                                                        <ListItemText
                                                            primary={`〒${result.postalCode}`}
                                                            secondary={`${result.prefecture} ${result.city} ${result.town}`}
                                                        />
                                                    </ListItemButton>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Grid>
                                )}

                                {postalCodeError && showPostalCodeSelector && (
                                    <Grid item xs={12}>
                                        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setShowPostalCodeSelector(false)}>
                                            {postalCodeError}
                                        </Alert>
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="town"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="町名"
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: (
                                                        <Tooltip title="住所から郵便番号を検索">
                                                            <IconButton
                                                                size="small"
                                                                onClick={handleSearchPostalCode}
                                                                disabled={!prefecture || !city || postalCodeLoading}
                                                            >
                                                                {postalCodeLoading ? <CircularProgress size={20} /> : <SearchIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="streetNumber"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="番地" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="building"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="建物名" fullWidth />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* 連絡先 */}
                    <Accordion
                        expanded={expandedSections.includes('contact')}
                        onChange={handleAccordionChange('contact')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">連絡先</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="電話番号" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="phone2"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="電話番号2" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="mobile"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="携帯番号" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="email"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="メールアドレス"
                                                fullWidth
                                                type="email"
                                                error={!!errors.email}
                                                helperText={errors.email?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* CRM管理情報 */}
                    <Accordion
                        expanded={expandedSections.includes('crm')}
                        onChange={handleAccordionChange('crm')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">CRM管理情報</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="visitRoute"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={visitRouteOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="来寺経緯" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="receptionist"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={activeEmployees.map(e => e.name)}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={employeesLoading}
                                                getOptionLabel={(option) => {
                                                    const employee = activeEmployees.find(e => e.name === option);
                                                    return employee?.furigana ? `${option} (${employee.furigana})` : option;
                                                }}
                                                renderOption={(props, option) => {
                                                    const employee = activeEmployees.find(e => e.name === option);
                                                    return (
                                                        <li {...props}>
                                                            {option}{employee?.furigana ? ` (${employee.furigana})` : ''}
                                                        </li>
                                                    );
                                                }}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="受付担当" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="otherCompanyReferralDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="他社紹介日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="doNotContact"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={<Checkbox checked={field.value || false} onChange={field.onChange} />}
                                                label="営業活動不可"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller
                                        name="crossSellTarget"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={<Checkbox checked={field.value || false} onChange={field.onChange} />}
                                                label="クロスセル対象"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="memo"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="備考" fullWidth multiline rows={3} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="notes"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="社内メモ" fullWidth multiline rows={3} />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* 典礼責任者 */}
                    <Accordion
                        expanded={expandedSections.includes('memorial')}
                        onChange={handleAccordionChange('memorial')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">典礼責任者</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="memorialContactName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="典礼責任者名" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="memorialContactRelationship"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={relationshipOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="続柄" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="memorialContactPostalCode"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="郵便番号" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={8}>
                                    <Controller
                                        name="memorialContactAddress"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="住所" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="memorialContactPhone"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="電話番号" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="memorialContactMobile"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="携帯番号" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="memorialContactEmail"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="メールアドレス"
                                                fullWidth
                                                type="email"
                                                error={!!errors.memorialContactEmail}
                                                helperText={errors.memorialContactEmail?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* 使用者変更 */}
                    <Accordion
                        expanded={expandedSections.includes('userChange')}
                        onChange={handleAccordionChange('userChange')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">使用者変更</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="userHasChanged"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={<Checkbox checked={field.value || false} onChange={field.onChange} />}
                                                label="使用者変更あり"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="previousUserName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="旧使用者氏名" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="relationshipToNewUser"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={relationshipOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="新使用者との続柄" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="userChangeReason"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="使用者変更理由" fullWidth multiline rows={2} />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* ニーズ・嗜好 */}
                    <Accordion
                        expanded={expandedSections.includes('needs')}
                        onChange={handleAccordionChange('needs')}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">ニーズ・嗜好</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="searchReason"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="お探しの理由" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="familyStructure"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="家族構成" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="religiousSect"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={religiousSectOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="宗旨・宗派" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="preferredPlan"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={planOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="希望プラン" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="burialPlannedCount"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="埋葬予定人数" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="purchaseTiming"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="お墓の購入時期" fullWidth />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Controller
                                        name="transportation"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={transportationOptions}
                                                value={field.value || ''}
                                                onChange={(_, newValue) => field.onChange(newValue || '')}
                                                onInputChange={(_, newInputValue) => field.onChange(newInputValue)}
                                                freeSolo
                                                loading={mastersLoading}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="交通手段" fullWidth />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="appealPoints"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="気に入っていただけた点" fullWidth multiline rows={2} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="appealPointsOther"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="その他（気に入った点）" fullWidth multiline rows={2} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="concerns"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="お墓について気になること" fullWidth multiline rows={2} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="otherConsultation"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="その他のご相談" fullWidth multiline rows={2} />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>
                    キャンセル
                </Button>
                <Button
                    onClick={handleSubmit(handleFormSubmit)}
                    variant="contained"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <CircularProgress size={24} /> : mode === 'create' ? '登録' : '更新'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
